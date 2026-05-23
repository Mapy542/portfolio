import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';

import {
	createEmptyPinmuxProjectDocument,
	getEffectiveEnabledSignalIds,
	isSignalEnabledByDefault,
	normalizeEnabledSignalIds,
	parseMcuDefinitionDocumentJson,
	parsePinmuxProjectDocumentJson,
	serializeMcuDefinitionDocument,
	serializePinmuxProjectDocument,
	stampPinmuxProjectDocument,
	type McuDefinitionDocument,
	type PeripheralInstance,
	type PinOverrideMode,
	type PinmuxProjectDocument,
	type RoutingChoiceKind
} from '$lib/pinmux/model';
import { getBuiltInDefinitions, isBuiltInDefinitionId } from '$lib/pinmux/registry';
import type {
	PinmuxDiagnostic,
	PinmuxSolveResponse,
	PinmuxSolveSuccess,
	ResolvedSignalAssignment
} from '$lib/pinmux/worker-types';

export interface DefinitionOption {
	id: string;
	label: string;
	vendor: string;
	family: string;
	builtIn: boolean;
}

export interface PeripheralRow {
	id: string;
	family: string;
	label: string;
	description: string;
	enabled: boolean;
	canEnable: boolean;
	disabledReason: string | null;
	routingOptions: Array<{ id: string; label: string }>;
	activeRoutingOptionId: string | null;
	availableRoutingOptionIds: string[];
	choiceKind: RoutingChoiceKind;
	color: string;
	signalSummary: string;
	activeSignalCount: number;
	signals: Array<{
		id: string;
		label: string;
		required: boolean;
		enabled: boolean;
		defaultEnabled: boolean;
		canEnable: boolean;
		disabledReason: string | null;
	}>;
	isFocused: boolean;
}

export interface PinRow {
	id: string;
	packageNumber: string;
	name: string;
	isStatic: boolean;
	overrideMode: PinOverrideMode;
	label: string;
	assignedLabel: string;
	assignedPeripheralId: string | null;
	assignedSignalId: string | null;
	activeRoutingOptionId: string | null;
	af: string | null;
	color: string | null;
	supportedModes: PinOverrideMode[];
	isFocused: boolean;
}

export type PinmuxSolveState = 'idle' | 'solving' | 'ready' | 'error';

type ProjectMutationSource = 'pin-override' | 'other';

function getDisplayedSolveResponse(
	solveResult: PinmuxSolveResponse | null,
	lastSuccessfulSolveResult: PinmuxSolveSuccess | null
): PinmuxSolveResponse | null {
	if (solveResult?.ok === false && lastSuccessfulSolveResult) {
		return lastSuccessfulSolveResult;
	}

	return solveResult;
}

function resolveActiveDefinition(
	definitionCatalog: McuDefinitionDocument[],
	project: PinmuxProjectDocument
): McuDefinitionDocument | null {
	if (project.embeddedDefinition && project.embeddedDefinition.id === project.selectedDefinitionId) {
		return project.embeddedDefinition;
	}

	return (
		definitionCatalog.find((definition) => definition.id === project.selectedDefinitionId) ??
		project.embeddedDefinition ??
		null
	);
}

function upsertDefinition(
	definitions: McuDefinitionDocument[],
	definition: McuDefinitionDocument
): McuDefinitionDocument[] {
	const filtered = definitions.filter((candidate) => candidate.id !== definition.id);
	return [...filtered, definition].sort((left, right) =>
		`${left.vendor} ${left.name}`.localeCompare(`${right.vendor} ${right.name}`)
	);
}

function upsertPeripheralState(
	project: PinmuxProjectDocument,
	peripheral: PeripheralInstance,
	nextState: {
		enabled: boolean;
		selectedRoutingOptionId: string | null;
		routingChoiceKind: RoutingChoiceKind;
		enabledSignalIds?: string[];
	}
): PinmuxProjectDocument {
	const existingIndex = project.peripheralStates.findIndex(
		(state) => state.peripheralId === peripheral.id
	);
	const existing = existingIndex === -1 ? null : project.peripheralStates[existingIndex];
	const candidate = {
		peripheralId: peripheral.id,
		...nextState,
		enabledSignalIds:
			nextState.enabledSignalIds !== undefined
				? normalizeEnabledSignalIds(peripheral, nextState.enabledSignalIds)
				: existing?.enabledSignalIds
	};
	const peripheralStates = [...project.peripheralStates];

	if (existingIndex === -1) {
		peripheralStates.push(candidate);
	} else {
		peripheralStates[existingIndex] = candidate;
	}

	return {
		...project,
		peripheralStates
	};
}

function upsertPinState(
	project: PinmuxProjectDocument,
	pinId: string,
	changes: Partial<{ overrideMode: PinOverrideMode; label: string }>
): PinmuxProjectDocument {
	const existingIndex = project.pinStates.findIndex((state) => state.pinId === pinId);
	const existing =
		existingIndex === -1
			? {
				pinId,
				overrideMode: 'auto' as PinOverrideMode,
				label: ''
			}
			: project.pinStates[existingIndex];
	const pinStates = [...project.pinStates];
	const candidate = {
		...existing,
		...changes
	};

	if (existingIndex === -1) {
		pinStates.push(candidate);
	} else {
		pinStates[existingIndex] = candidate;
	}

	return {
		...project,
		pinStates
	};
}

function getDefaultRoutingOptionId(peripheral: PeripheralInstance): string | null {
	return peripheral.routingOptions[0]?.id ?? null;
}

function colorFromId(id: string): string {
	let hash = 0;

	for (const character of id) {
		hash = (hash * 31 + character.charCodeAt(0)) | 0;
	}

	const hue = Math.abs(hash) % 360;
	return `hsl(${hue} 72% 46%)`;
}

function comparePackageNumbers(left: string, right: string): number {
	const leftNumber = Number(left);
	const rightNumber = Number(right);

	if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
		return leftNumber - rightNumber;
	}

	return left.localeCompare(right, undefined, { numeric: true });
}

function formatOverrideMode(mode: PinOverrideMode): string {
	return mode.replace(/-/g, ' ');
}

function isStaticPin(supportedModes: PinOverrideMode[]): boolean {
	return supportedModes.length === 1 && supportedModes[0] === 'auto';
}

function buildExportableProject(
	project: PinmuxProjectDocument,
	activeDefinition: McuDefinitionDocument | null
): PinmuxProjectDocument {
	return {
		...stampPinmuxProjectDocument(project),
		selectedDefinitionId: activeDefinition?.id ?? project.selectedDefinitionId,
		embeddedDefinition:
			activeDefinition && !isBuiltInDefinitionId(activeDefinition.id) ? activeDefinition : null
	};
}

function getInitialDefinitionId(definitions: McuDefinitionDocument[]): string | null {
	return (
		definitions.find((definition) => definition.id === 'wch-ch32v307vct6-lqfp100')?.id ??
		definitions[0]?.id ??
		null
	);
}

export function createPinmuxStore() {
	const builtInDefinitions = getBuiltInDefinitions();
	const definitionCatalog = writable<McuDefinitionDocument[]>(builtInDefinitions);
	const project = writable<PinmuxProjectDocument>(
		createEmptyPinmuxProjectDocument(getInitialDefinitionId(builtInDefinitions))
	);
	const focusedPinId = writable<string | null>(null);
	const focusedPeripheralId = writable<string | null>(null);
	const solveState = writable<PinmuxSolveState>('idle');
	const solveDiagnostics = writable<PinmuxDiagnostic[]>([]);
	const solveResult = writable<PinmuxSolveResponse | null>(null);
	const lastSuccessfulSolveResult = writable<PinmuxSolveSuccess | null>(null);
	const solveErrorMessage = writable<string | null>(null);

	let solveWorker: Worker | null = null;
	let activeRequestId: string | null = null;
	let requestCounter = 0;
	let pendingSolveSource: ProjectMutationSource = 'other';
	const requestSourceById = new Map<string, ProjectMutationSource>();

	function replaceProject(
		nextProject: PinmuxProjectDocument,
		source: ProjectMutationSource = 'other'
	) {
		pendingSolveSource = source;
		project.set(stampPinmuxProjectDocument(nextProject));
	}

	function updateProject(
		mutator: (current: PinmuxProjectDocument) => PinmuxProjectDocument,
		source: ProjectMutationSource = 'other'
	) {
		pendingSolveSource = source;
		project.update((current) => stampPinmuxProjectDocument(mutator(current)));
	}

	function ensureWorker() {
		if (!browser) {
			return null;
		}

		if (!solveWorker) {
			solveWorker = new Worker(new URL('./solver.worker.ts', import.meta.url), {
				type: 'module'
			});

			solveWorker.addEventListener('message', (event: MessageEvent<PinmuxSolveResponse>) => {
				if (event.data.requestId !== activeRequestId) {
					requestSourceById.delete(event.data.requestId);
					return;
				}

				const requestSource = requestSourceById.get(event.data.requestId) ?? 'other';
				requestSourceById.delete(event.data.requestId);

				if (event.data.ok) {
					solveResult.set(event.data);
					lastSuccessfulSolveResult.set(event.data);
					solveDiagnostics.set(event.data.diagnostics);
					solveErrorMessage.set(null);
					solveState.set('ready');

					if (requestSource !== 'pin-override') {
						return;
					}

					const currentProject = get(project);
					let changed = false;
					const peripheralStates = currentProject.peripheralStates.map((state) => {
						const resolved = event.data.solution.peripheralStates.find(
							(candidate) => candidate.peripheralId === state.peripheralId
						);
						let nextState = state;

						if (state.enabled && resolved && !resolved.enabled) {
							changed = true;
							nextState = {
								...nextState,
								enabled: false
							};
						}

						if (
							!resolved ||
							!nextState.enabled ||
							resolved.activeRoutingOptionId === nextState.selectedRoutingOptionId
						) {
							return nextState;
						}

						changed = true;
						return {
							...nextState,
							selectedRoutingOptionId: resolved.activeRoutingOptionId,
							routingChoiceKind: 'auto' as const
						};
					});

					if (changed) {
						replaceProject(
							{
								...currentProject,
								peripheralStates
							},
							'other'
						);
					}

					return;
				}

				solveResult.set(event.data);
				solveDiagnostics.set(event.data.diagnostics);
				solveErrorMessage.set(event.data.message);
				solveState.set('error');
			});

			solveWorker.addEventListener('error', (event) => {
				solveDiagnostics.set([
					{
						id: 'pinmux-worker-crash',
						level: 'error',
						message:
							event.message ||
							'The pinmux solver worker crashed while evaluating the current selection.'
					}
				]);
				solveErrorMessage.set(
					event.message ||
						'The pinmux solver worker crashed while evaluating the current selection.'
				);
				solveState.set('error');
			});
		}

		return solveWorker;
	}

	const activeDefinition = derived([definitionCatalog, project], ([$definitionCatalog, $project]) =>
		resolveActiveDefinition($definitionCatalog, $project)
	);

	const definitionOptions = derived(definitionCatalog, ($definitionCatalog) =>
		$definitionCatalog.map((definition) => ({
			id: definition.id,
			label: `${definition.vendor} ${definition.name}`,
			vendor: definition.vendor,
			family: definition.family,
			builtIn: isBuiltInDefinitionId(definition.id)
		}))
	);

	const activePackage = derived(activeDefinition, ($activeDefinition) => $activeDefinition?.package ?? null);

	const projectName = derived(project, ($project) => $project.meta.name);
	const displayedSolveResult = derived(
		[solveResult, lastSuccessfulSolveResult],
		([$solveResult, $lastSuccessfulSolveResult]) =>
			getDisplayedSolveResponse($solveResult, $lastSuccessfulSolveResult)
	);

	const peripheralRows = derived(
		[activeDefinition, project, solveResult, focusedPeripheralId],
		([$activeDefinition, $project, $solveResult, $focusedPeripheralId]) => {
			if (!$activeDefinition) {
				return [] as PeripheralRow[];
			}

			const projectStateMap = new Map(
				$project.peripheralStates.map((state) => [state.peripheralId, state])
			);
			const resolvedStateMap = new Map(
				($solveResult?.solution.peripheralStates ?? []).map((state) => [state.peripheralId, state])
			);

			return $activeDefinition.peripherals.map((peripheral) => {
				const projectState = projectStateMap.get(peripheral.id) ?? {
					peripheralId: peripheral.id,
					enabled: false,
					selectedRoutingOptionId: getDefaultRoutingOptionId(peripheral),
					routingChoiceKind: 'auto' as const
				};
				const resolved = resolvedStateMap.get(peripheral.id);
				const activeSignalIds = getEffectiveEnabledSignalIds(peripheral, projectState);
				const availableSignalIds = new Set(
					resolved?.availableSignalIds ?? peripheral.signals.map((signal) => signal.id)
				);
				const signals = peripheral.signals.map((signal) => ({
					id: signal.id,
					label: signal.label,
					required: signal.required,
					enabled: activeSignalIds.has(signal.id),
					defaultEnabled: isSignalEnabledByDefault(signal),
					canEnable: signal.required || availableSignalIds.has(signal.id),
					disabledReason:
						signal.required || availableSignalIds.has(signal.id)
							? null
							: 'Enabling this signal would leave no conflict-free routing.'
				}));
				const activeSignalLabels = signals
					.filter((signal) => signal.enabled)
					.map((signal) => signal.label);

				return {
					id: peripheral.id,
					family: peripheral.family,
					label: peripheral.label,
					description: peripheral.description,
					enabled: resolved?.enabled ?? projectState.enabled,
					canEnable: resolved?.canEnable ?? true,
					disabledReason: resolved?.disabledReason ?? null,
					routingOptions: peripheral.routingOptions.map((option) => ({
						id: option.id,
						label: option.label
					})),
					activeRoutingOptionId:
						resolved?.activeRoutingOptionId ?? projectState.selectedRoutingOptionId ?? null,
					availableRoutingOptionIds:
						resolved?.availableRoutingOptionIds ??
						peripheral.routingOptions.map((option) => option.id),
					choiceKind: projectState.routingChoiceKind,
					color: colorFromId(peripheral.id),
					signalSummary:
						activeSignalLabels.length > 0
							? activeSignalLabels.join(' / ')
							: 'No active signals selected',
					activeSignalCount: activeSignalLabels.length,
					signals,
					isFocused: $focusedPeripheralId === peripheral.id
				};
			});
		}
	);

	const pinRows = derived(
		[activeDefinition, project, displayedSolveResult, focusedPinId],
		([$activeDefinition, $project, $displayedSolveResult, $focusedPinId]) => {
			if (!$activeDefinition) {
				return [] as PinRow[];
			}

			const projectPinStateMap = new Map($project.pinStates.map((state) => [state.pinId, state]));
			const assignmentByPin = new Map(
				($displayedSolveResult?.solution.assignments ?? []).map((assignment) => [assignment.pinId, assignment])
			);
			const activeRoutingOptionByPeripheral = new Map(
				($displayedSolveResult?.solution.peripheralStates ?? []).map((state) => [
					state.peripheralId,
					state.activeRoutingOptionId
				])
			);

			return [...$activeDefinition.pins]
				.sort((left, right) => comparePackageNumbers(left.packageNumber, right.packageNumber))
				.map((pin) => {
					const pinState = projectPinStateMap.get(pin.id) ?? {
						pinId: pin.id,
						overrideMode: 'auto' as PinOverrideMode,
						label: ''
					};
					const assignment = assignmentByPin.get(pin.id) ?? null;
					const staticPin = isStaticPin(pin.supportedModes);

					return {
						id: pin.id,
						packageNumber: pin.packageNumber,
						name: pin.name,
						isStatic: staticPin,
						overrideMode: pinState.overrideMode,
						label: pinState.label,
						assignedLabel: assignment
							? `${assignment.peripheralId} ${assignment.signalId}`
							: staticPin
								? 'Static'
							: pinState.overrideMode !== 'auto'
								? formatOverrideMode(pinState.overrideMode)
								: 'Available',
						assignedPeripheralId: assignment?.peripheralId ?? null,
						assignedSignalId: assignment?.signalId ?? null,
						activeRoutingOptionId: assignment
							? activeRoutingOptionByPeripheral.get(assignment.peripheralId) ?? null
							: null,
						af: assignment?.af ?? null,
						color: assignment
							? colorFromId(assignment.peripheralId)
							: staticPin
								? 'hsl(36 9% 60%)'
							: pinState.overrideMode !== 'auto'
								? 'hsl(202 24% 54%)'
								: null,
						supportedModes: pin.supportedModes,
						isFocused: $focusedPinId === pin.id
					};
				});
		}
	);

	const solveSubscription = derived([project, activeDefinition], ([$project, $activeDefinition]) => ({
		project: $project,
		definition: $activeDefinition
	})).subscribe(({ project: activeProject, definition }) => {
		if (!definition) {
			solveState.set('idle');
			solveDiagnostics.set([
				{
					id: 'missing-active-definition',
					level: 'warning',
					message: 'Import or select an MCU definition to begin routing.'
				}
			]);
			solveResult.set(null);
			lastSuccessfulSolveResult.set(null);
			solveErrorMessage.set(null);
			return;
		}

		const worker = ensureWorker();

		if (!worker) {
			return;
		}

		activeRequestId = `pinmux-${Date.now()}-${requestCounter++}`;
		requestSourceById.set(activeRequestId, pendingSolveSource);
		pendingSolveSource = 'other';
		solveState.set('solving');
		worker.postMessage({
			requestId: activeRequestId,
			definition,
			project: activeProject
		});
	});

	function selectDefinition(definitionId: string) {
		const definition = get(definitionCatalog).find((candidate) => candidate.id === definitionId) ?? null;
		const nextProject = createEmptyPinmuxProjectDocument(definitionId || null);

		if (definition && !isBuiltInDefinitionId(definition.id)) {
			nextProject.embeddedDefinition = definition;
		}

		solveResult.set(null);
		lastSuccessfulSolveResult.set(null);
		replaceProject(nextProject, 'other');
		focusedPinId.set(null);
		focusedPeripheralId.set(null);
	}

	function setProjectName(name: string) {
		updateProject((current) => ({
			...current,
			meta: {
				...current.meta,
				name
			}
		}));
	}

	function togglePeripheral(peripheralId: string, enabled: boolean) {
		const definition = get(activeDefinition);
		const peripheral = definition?.peripherals.find((candidate) => candidate.id === peripheralId);
		const row = get(peripheralRows).find((candidate) => candidate.id === peripheralId);

		if (!peripheral || (enabled && row && !row.canEnable)) {
			return;
		}

		updateProject((current) =>
			upsertPeripheralState(current, peripheral, {
				enabled,
				selectedRoutingOptionId:
					current.peripheralStates.find((state) => state.peripheralId === peripheralId)
						?.selectedRoutingOptionId ?? getDefaultRoutingOptionId(peripheral),
				routingChoiceKind: 'auto'
			})
		);
		focusedPeripheralId.set(peripheralId);
	}

	function setPeripheralRoutingOption(peripheralId: string, routingOptionId: string | null) {
		const definition = get(activeDefinition);
		const peripheral = definition?.peripherals.find((candidate) => candidate.id === peripheralId);
		const row = get(peripheralRows).find((candidate) => candidate.id === peripheralId);

		if (
			!peripheral ||
			(routingOptionId !== null && row && !row.availableRoutingOptionIds.includes(routingOptionId))
		) {
			return;
		}

		updateProject((current) =>
			upsertPeripheralState(current, peripheral, {
				enabled: true,
				selectedRoutingOptionId: routingOptionId,
				routingChoiceKind: 'explicit'
			})
		);
		focusedPeripheralId.set(peripheralId);
	}

	function setPeripheralSignalEnabled(peripheralId: string, signalId: string, enabled: boolean) {
		const definition = get(activeDefinition);
		const peripheral = definition?.peripherals.find((candidate) => candidate.id === peripheralId);
		const signal = peripheral?.signals.find((candidate) => candidate.id === signalId);
		const row = get(peripheralRows).find((candidate) => candidate.id === peripheralId);
		const rowSignal = row?.signals.find((candidate) => candidate.id === signalId);

		if (!peripheral || !signal || signal.required || (enabled && rowSignal && !rowSignal.canEnable)) {
			return;
		}

		updateProject((current) => {
			const existingState = current.peripheralStates.find(
				(state) => state.peripheralId === peripheralId
			);
			const nextEnabledSignalIds = new Set(
				Array.from(getEffectiveEnabledSignalIds(peripheral, existingState)).filter((candidateId) => {
					const candidateSignal = peripheral.signals.find((candidate) => candidate.id === candidateId);
					return !!candidateSignal && !candidateSignal.required;
				})
			);

			if (enabled) {
				nextEnabledSignalIds.add(signalId);
			} else {
				nextEnabledSignalIds.delete(signalId);
			}

			return upsertPeripheralState(current, peripheral, {
				enabled: existingState?.enabled ?? true,
				selectedRoutingOptionId:
					existingState?.selectedRoutingOptionId ?? getDefaultRoutingOptionId(peripheral),
				routingChoiceKind: existingState?.routingChoiceKind ?? 'auto',
				enabledSignalIds: peripheral.signals
					.filter((candidate) => !candidate.required && nextEnabledSignalIds.has(candidate.id))
					.map((candidate) => candidate.id)
			});
		});
		focusedPeripheralId.set(peripheralId);
	}

	function setPinOverrideMode(pinId: string, overrideMode: PinOverrideMode) {
		const definition = get(activeDefinition);
		const pin = definition?.pins.find((candidate) => candidate.id === pinId);

		if (pin && isStaticPin(pin.supportedModes)) {
			return;
		}

		updateProject((current) => upsertPinState(current, pinId, { overrideMode }), 'pin-override');
		focusedPinId.set(pinId);
	}

	function setPinLabel(pinId: string, label: string) {
		const definition = get(activeDefinition);
		const pin = definition?.pins.find((candidate) => candidate.id === pinId);

		if (pin && isStaticPin(pin.supportedModes)) {
			return;
		}

		updateProject((current) => upsertPinState(current, pinId, { label }));
	}

	function focusPin(pinId: string) {
		focusedPinId.set(pinId);
		const assignment = get(displayedSolveResult)?.solution.assignments.find(
			(candidate) => candidate.pinId === pinId
		);
		focusedPeripheralId.set(assignment?.peripheralId ?? null);
	}

	function focusPeripheral(peripheralId: string) {
		focusedPeripheralId.set(peripheralId);
		const assignment = get(displayedSolveResult)?.solution.assignments.find(
			(candidate) => candidate.peripheralId === peripheralId
		);
		focusedPinId.set(assignment?.pinId ?? null);
	}

	function importDefinitionJson(json: string) {
		const definition = parseMcuDefinitionDocumentJson(json);
		definitionCatalog.update((definitions) => upsertDefinition(definitions, definition));

		const nextProject = createEmptyPinmuxProjectDocument(definition.id);
		nextProject.embeddedDefinition = definition;
		solveResult.set(null);
		lastSuccessfulSolveResult.set(null);
		replaceProject(nextProject, 'other');
		focusedPinId.set(null);
		focusedPeripheralId.set(null);
	}

	function exportActiveDefinitionJson(): string | null {
		const definition = get(activeDefinition);
		return definition ? serializeMcuDefinitionDocument(definition) : null;
	}

	function importProjectJson(json: string) {
		const importedProject = parsePinmuxProjectDocumentJson(json);

		if (importedProject.embeddedDefinition) {
			definitionCatalog.update((definitions) =>
				upsertDefinition(definitions, importedProject.embeddedDefinition as McuDefinitionDocument)
			);
		}

		solveResult.set(null);
		lastSuccessfulSolveResult.set(null);
		replaceProject(importedProject, 'other');
		focusedPinId.set(null);
		focusedPeripheralId.set(null);
	}

	function exportProjectJson(): string {
		return serializePinmuxProjectDocument(buildExportableProject(get(project), get(activeDefinition)));
	}

	function exportCsv(): string {
		const rows = get(pinRows);
		const header = ['Package Pin', 'GPIO', 'Resolved Assignment', 'AF / Route', 'Override', 'Label'];
		const body = rows.map((row) => [
			row.packageNumber,
			row.name,
			row.assignedLabel,
			row.af ?? row.activeRoutingOptionId ?? '',
			row.overrideMode,
			row.label
		]);

		return [header, ...body]
			.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
			.join('\n');
	}

	function destroy() {
		solveSubscription();
		solveWorker?.terminate();
	}

	return {
		activeDefinition,
		activePackage,
		definitionOptions,
		project,
		projectName,
		peripheralRows,
		pinRows,
		focusedPinId,
		focusedPeripheralId,
		solveState,
		solveDiagnostics,
		solveErrorMessage,
		selectDefinition,
		setProjectName,
		togglePeripheral,
		setPeripheralRoutingOption,
		setPeripheralSignalEnabled,
		setPinOverrideMode,
		setPinLabel,
		focusPin,
		focusPeripheral,
		importDefinitionJson,
		exportActiveDefinitionJson,
		importProjectJson,
		exportProjectJson,
		exportCsv,
		destroy
	};
}