import { getEffectiveEnabledSignalIds, getSignalRoutingOptionIds } from '$lib/pinmux/model';
import type {
	McuDefinitionDocument,
	PeripheralInstance,
	PeripheralProjectState,
	PeripheralSignal,
	PinProjectState,
	PinmuxProjectDocument
} from '$lib/pinmux/model';
import type {
	PinmuxDiagnostic,
	PinmuxSolution,
	ResolvedPeripheralState,
	ResolvedPinState,
	ResolvedSignalAssignment
} from '$lib/pinmux/worker-types';

interface SearchOverrides {
	enabled?: Map<string, boolean>;
	hardRoutingOptionIds?: Map<string, string | null>;
	hardSignalRoutingOptionIds?: Map<string, string>;
}

interface SolveBranch {
	assignments: ResolvedSignalAssignment[];
	activeRoutingOptionIds: Map<string, string | null>;
}

function getEffectiveEnabledState(
	peripheralId: string,
	peripheralStateMap: Map<string, PeripheralProjectState>,
	enabledOverrides: Map<string, boolean>
): boolean {
	return (
		enabledOverrides.get(peripheralId) ?? peripheralStateMap.get(peripheralId)?.enabled ?? false
	);
}

function getPeripheralStateMap(
	project: PinmuxProjectDocument
): Map<string, PeripheralProjectState> {
	return new Map(project.peripheralStates.map((state) => [state.peripheralId, state]));
}

function getPinStateMap(project: PinmuxProjectDocument): Map<string, PinProjectState> {
	return new Map(project.pinStates.map((state) => [state.pinId, state]));
}

function getSignalRouteKey(peripheralId: string, signalId: string): string {
	return `${peripheralId}:${signalId}`;
}

function hasPinOverrides(project: PinmuxProjectDocument): boolean {
	return project.pinStates.some((pinState) => pinState.overrideMode !== 'auto');
}

function clearPinOverrides(project: PinmuxProjectDocument): PinmuxProjectDocument {
	if (!hasPinOverrides(project)) {
		return project;
	}

	return {
		...project,
		pinStates: project.pinStates.map((pinState) =>
			pinState.overrideMode === 'auto'
				? pinState
				: {
						...pinState,
						overrideMode: 'auto'
					}
		)
	};
}

function upsertProjectPeripheralState(
	project: PinmuxProjectDocument,
	peripheralId: string,
	buildNextState: (currentState: PeripheralProjectState | null) => PeripheralProjectState
): PinmuxProjectDocument {
	const existingIndex = project.peripheralStates.findIndex(
		(state) => state.peripheralId === peripheralId
	);
	const currentState = existingIndex === -1 ? null : project.peripheralStates[existingIndex];
	const nextState = buildNextState(currentState);
	const peripheralStates = [...project.peripheralStates];

	if (existingIndex === -1) {
		peripheralStates.push(nextState);
	} else {
		peripheralStates[existingIndex] = nextState;
	}

	return {
		...project,
		peripheralStates
	};
}

function getOptionalActiveSignalIds(
	peripheral: PeripheralInstance,
	peripheralState: PeripheralProjectState | null
): string[] {
	const activeSignalIds = getEffectiveEnabledSignalIds(peripheral, peripheralState);

	return peripheral.signals
		.filter((signal) => !signal.required && activeSignalIds.has(signal.id))
		.map((signal) => signal.id);
}

function withPeripheralSignalEnabled(
	project: PinmuxProjectDocument,
	peripheral: PeripheralInstance,
	signalId: string,
	enabled: boolean
): PinmuxProjectDocument {
	return upsertProjectPeripheralState(project, peripheral.id, (currentState) => {
		const enabledSignalIds = new Set(getOptionalActiveSignalIds(peripheral, currentState));

		if (enabled) {
			enabledSignalIds.add(signalId);
		} else {
			enabledSignalIds.delete(signalId);
		}

		return {
			peripheralId: peripheral.id,
			enabled: currentState?.enabled ?? true,
			selectedRoutingOptionId: currentState?.selectedRoutingOptionId ?? null,
			routingChoiceKind: currentState?.routingChoiceKind ?? 'auto',
			selectedSignalRoutingOptionIds: currentState?.selectedSignalRoutingOptionIds,
			enabledSignalIds: peripheral.signals
				.filter((signal) => !signal.required && enabledSignalIds.has(signal.id))
				.map((signal) => signal.id)
		};
	});
}

function getScenarioCacheKey(
	project: PinmuxProjectDocument,
	overrides: SearchOverrides = {}
): string {
	const peripheralStates = [...project.peripheralStates]
		.map((state) => ({
			peripheralId: state.peripheralId,
			enabled: state.enabled,
			routingChoiceKind: state.routingChoiceKind,
			selectedRoutingOptionId: state.selectedRoutingOptionId ?? null,
			enabledSignalIds: state.enabledSignalIds ?? null,
			selectedSignalRoutingOptionIds: state.selectedSignalRoutingOptionIds
				? Object.fromEntries(
						Object.entries(state.selectedSignalRoutingOptionIds).sort(([left], [right]) =>
							left.localeCompare(right)
						)
					)
				: null
		}))
		.sort((left, right) => left.peripheralId.localeCompare(right.peripheralId));
	const pinStates = [...project.pinStates]
		.filter((state) => state.overrideMode !== 'auto')
		.map((state) => ({
			pinId: state.pinId,
			overrideMode: state.overrideMode
		}))
		.sort((left, right) => left.pinId.localeCompare(right.pinId));
	const enabledOverrides = [...(overrides.enabled ?? new Map()).entries()].sort((left, right) =>
		left[0].localeCompare(right[0])
	);
	const hardRoutingOptionIds = [...(overrides.hardRoutingOptionIds ?? new Map()).entries()].sort(
		(left, right) => left[0].localeCompare(right[0])
	);
	const hardSignalRoutingOptionIds = [
		...(overrides.hardSignalRoutingOptionIds ?? new Map()).entries()
	].sort((left, right) => left[0].localeCompare(right[0]));

	return JSON.stringify({
		peripheralStates,
		pinStates,
		enabledOverrides,
		hardRoutingOptionIds,
		hardSignalRoutingOptionIds
	});
}

function getRoutingOptionIds(peripheral: PeripheralInstance): Array<string | null> {
	if (peripheral.routingOptions.length === 0) {
		return [null];
	}

	return peripheral.routingOptions.map((option) => option.id);
}

function getOrderedRoutingOptionIds(
	peripheral: PeripheralInstance,
	peripheralStateMap: Map<string, PeripheralProjectState>,
	hardRoutingOptionIds: Map<string, string | null>
): Array<string | null> {
	const optionIds = getRoutingOptionIds(peripheral);

	if (hardRoutingOptionIds.has(peripheral.id)) {
		const forcedId = hardRoutingOptionIds.get(peripheral.id) ?? null;
		return optionIds.some((candidate) => candidate === forcedId) ? [forcedId] : [];
	}

	const peripheralState = peripheralStateMap.get(peripheral.id) ?? null;
	const preferredId = peripheralState?.selectedRoutingOptionId ?? null;

	if (peripheralState?.routingChoiceKind === 'explicit') {
		return optionIds.some((candidate) => candidate === preferredId) ? [preferredId] : [];
	}

	if (preferredId === null || !optionIds.some((candidate) => candidate === preferredId)) {
		return optionIds;
	}

	return optionIds;
}

function getSelectedSignalRoutingOptionId(
	peripheralId: string,
	signalId: string,
	peripheralStateMap: Map<string, PeripheralProjectState>,
	hardSignalRoutingOptionIds: Map<string, string>
): string | null {
	return (
		hardSignalRoutingOptionIds.get(getSignalRouteKey(peripheralId, signalId)) ??
		peripheralStateMap.get(peripheralId)?.selectedSignalRoutingOptionIds?.[signalId] ??
		null
	);
}

function getSignalCandidates(
	signal: PeripheralSignal,
	optionId: string | null,
	selectedSignalRoutingOptionId: string | null
) {
	return signal.candidates.filter((candidate) => {
		if (selectedSignalRoutingOptionId) {
			return candidate.routingOptionIds.includes(selectedSignalRoutingOptionId);
		}

		if (candidate.routingOptionIds.length === 0) {
			return true;
		}

		if (optionId !== null) {
			return candidate.routingOptionIds.includes(optionId);
		}

		return true;
	});
}

function getActiveSignals(
	peripheral: PeripheralInstance,
	peripheralStateMap: Map<string, PeripheralProjectState>
): PeripheralSignal[] {
	const activeSignalIds = getEffectiveEnabledSignalIds(
		peripheral,
		peripheralStateMap.get(peripheral.id)
	);

	return peripheral.signals.filter((signal) => activeSignalIds.has(signal.id));
}

function chooseNextPeripheral(
	remaining: PeripheralInstance[],
	usedPins: Set<string>,
	peripheralStateMap: Map<string, PeripheralProjectState>,
	hardRoutingOptionIds: Map<string, string | null>,
	hardSignalRoutingOptionIds: Map<string, string>
): PeripheralInstance {
	const ranked = remaining.map((peripheral) => {
		const activeSignals = getActiveSignals(peripheral, peripheralStateMap);
		const optionScore = getOrderedRoutingOptionIds(
			peripheral,
			peripheralStateMap,
			hardRoutingOptionIds
		)
			.map((optionId) =>
				activeSignals.reduce((score, signal) => {
					const available = getSignalCandidates(
						signal,
						optionId,
						getSelectedSignalRoutingOptionId(
							peripheral.id,
							signal.id,
							peripheralStateMap,
							hardSignalRoutingOptionIds
						)
					).filter((candidate) => !usedPins.has(candidate.pinId)).length;
					return score + available;
				}, 0)
			)
			.sort((left, right) => left - right)[0];

		return {
			peripheral,
			score: optionScore ?? Number.POSITIVE_INFINITY
		};
	});

	ranked.sort((left, right) => left.score - right.score);
	return ranked[0].peripheral;
}

function findSolution(
	definition: McuDefinitionDocument,
	project: PinmuxProjectDocument,
	overrides: SearchOverrides = {}
): SolveBranch | null {
	const peripheralStateMap = getPeripheralStateMap(project);
	const pinStateMap = getPinStateMap(project);
	const enabledOverrides = overrides.enabled ?? new Map<string, boolean>();
	const hardRoutingOptionIds = overrides.hardRoutingOptionIds ?? new Map<string, string | null>();
	const hardSignalRoutingOptionIds =
		overrides.hardSignalRoutingOptionIds ?? new Map<string, string>();
	const reservedPins = new Set(
		Array.from(pinStateMap.values())
			.filter((pinState) => pinState.overrideMode !== 'auto')
			.map((pinState) => pinState.pinId)
	);

	const enabledPeripherals = definition.peripherals.filter((peripheral) => {
		return getEffectiveEnabledState(peripheral.id, peripheralStateMap, enabledOverrides);
	});

	function search(
		remainingPeripherals: PeripheralInstance[],
		usedPins: Set<string>,
		assignments: ResolvedSignalAssignment[],
		activeRoutingOptionIds: Map<string, string | null>
	): SolveBranch | null {
		if (remainingPeripherals.length === 0) {
			return {
				assignments,
				activeRoutingOptionIds
			};
		}

		const peripheral = chooseNextPeripheral(
			remainingPeripherals,
			usedPins,
			peripheralStateMap,
			hardRoutingOptionIds,
			hardSignalRoutingOptionIds
		);
		const optionIds = getOrderedRoutingOptionIds(
			peripheral,
			peripheralStateMap,
			hardRoutingOptionIds
		);
		const nextPeripherals = remainingPeripherals.filter(
			(candidate) => candidate.id !== peripheral.id
		);

		for (const optionId of optionIds) {
			const orderedSignals = [...getActiveSignals(peripheral, peripheralStateMap)].sort(
				(left, right) => {
					const leftCount = getSignalCandidates(
						left,
						optionId,
						getSelectedSignalRoutingOptionId(
							peripheral.id,
							left.id,
							peripheralStateMap,
							hardSignalRoutingOptionIds
						)
					).filter((candidate) => !usedPins.has(candidate.pinId)).length;
					const rightCount = getSignalCandidates(
						right,
						optionId,
						getSelectedSignalRoutingOptionId(
							peripheral.id,
							right.id,
							peripheralStateMap,
							hardSignalRoutingOptionIds
						)
					).filter((candidate) => !usedPins.has(candidate.pinId)).length;

					return leftCount - rightCount;
				}
			);

			const assignSignals = (
				signalIndex: number,
				localUsedPins: Set<string>,
				localAssignments: ResolvedSignalAssignment[]
			): SolveBranch | null => {
				if (signalIndex === orderedSignals.length) {
					const nextRoutingOptions = new Map(activeRoutingOptionIds);
					nextRoutingOptions.set(peripheral.id, optionId);

					return search(
						nextPeripherals,
						localUsedPins,
						[...assignments, ...localAssignments],
						nextRoutingOptions
					);
				}

				const signal = orderedSignals[signalIndex];
				const selectedSignalRoutingOptionId = getSelectedSignalRoutingOptionId(
					peripheral.id,
					signal.id,
					peripheralStateMap,
					hardSignalRoutingOptionIds
				);
				const candidates = getSignalCandidates(
					signal,
					optionId,
					selectedSignalRoutingOptionId
				).filter((candidate) => !localUsedPins.has(candidate.pinId));

				if (candidates.length === 0) {
					return null;
				}

				for (const candidate of candidates) {
					const nextUsedPins = new Set(localUsedPins);
					nextUsedPins.add(candidate.pinId);

					const result = assignSignals(signalIndex + 1, nextUsedPins, [
						...localAssignments,
						{
							peripheralId: peripheral.id,
							signalId: signal.id,
							pinId: candidate.pinId,
							af: candidate.af,
							routingOptionId:
								selectedSignalRoutingOptionId ?? optionId ?? candidate.routingOptionIds[0] ?? null
						}
					]);

					if (result) {
						return result;
					}
				}

				return null;
			};

			const result = assignSignals(0, new Set(usedPins), []);

			if (result) {
				return result;
			}
		}

		return null;
	}

	return search(enabledPeripherals, reservedPins, [], new Map());
}

function buildResolvedPinStates(
	definition: McuDefinitionDocument,
	project: PinmuxProjectDocument,
	assignments: ResolvedSignalAssignment[]
): ResolvedPinState[] {
	const pinStateMap = getPinStateMap(project);
	const assignmentByPin = new Map(assignments.map((assignment) => [assignment.pinId, assignment]));

	return definition.pins.map((pin) => {
		const pinState = pinStateMap.get(pin.id) ?? {
			pinId: pin.id,
			overrideMode: 'auto',
			label: ''
		};
		const assignment = assignmentByPin.get(pin.id) ?? null;

		return {
			pinId: pin.id,
			ownerKind: assignment ? 'signal' : pinState.overrideMode !== 'auto' ? 'override' : 'free',
			peripheralId: assignment?.peripheralId ?? null,
			signalId: assignment?.signalId ?? null,
			overrideMode: pinState.overrideMode,
			af: assignment?.af ?? null,
			routingOptionId: assignment?.routingOptionId ?? null
		};
	});
}

export function analyzePinmuxProject(
	definition: McuDefinitionDocument,
	project: PinmuxProjectDocument
) {
	const diagnostics: PinmuxDiagnostic[] = [];
	const peripheralStateMap = getPeripheralStateMap(project);
	const pinOverridesPresent = hasPinOverrides(project);
	const projectWithoutPinOverrides = pinOverridesPresent ? clearPinOverrides(project) : project;
	const scenarioCache = new Map<string, SolveBranch | null>();
	const getScenarioSolution = (
		scenarioProject: PinmuxProjectDocument,
		overrides: SearchOverrides = {}
	): SolveBranch | null => {
		const cacheKey = getScenarioCacheKey(scenarioProject, overrides);

		if (!scenarioCache.has(cacheKey)) {
			scenarioCache.set(cacheKey, findSolution(definition, scenarioProject, overrides));
		}

		return scenarioCache.get(cacheKey) ?? null;
	};
	const canSolveScenario = (
		scenarioProject: PinmuxProjectDocument,
		overrides: SearchOverrides = {}
	): boolean => getScenarioSolution(scenarioProject, overrides) !== null;
	const currentProjectSolution = getScenarioSolution(project);
	const overrideBlockedPeripheralIds = new Set(
		pinOverridesPresent && currentProjectSolution === null
			? definition.peripherals
					.filter((peripheral) =>
						getEffectiveEnabledState(peripheral.id, peripheralStateMap, new Map())
					)
					.filter((peripheral) => {
						return canSolveScenario(projectWithoutPinOverrides, {
							enabled: new Map<string, boolean>([[peripheral.id, true]])
						});
					})
					.map((peripheral) => peripheral.id)
			: []
	);
	const effectiveEnabledOverrides = new Map<string, boolean>();

	for (const peripheralId of overrideBlockedPeripheralIds) {
		effectiveEnabledOverrides.set(peripheralId, false);
	}

	const currentSolution =
		overrideBlockedPeripheralIds.size === 0
			? currentProjectSolution
			: getScenarioSolution(project, {
					enabled: effectiveEnabledOverrides
				});
	const assignmentByPeripheralSignalKey = new Map(
		(currentSolution?.assignments ?? []).map((assignment) => [
			getSignalRouteKey(assignment.peripheralId, assignment.signalId),
			assignment
		])
	);
	const effectiveEnabledPeripheralCount = definition.peripherals.filter((peripheral) => {
		if (overrideBlockedPeripheralIds.has(peripheral.id)) {
			return false;
		}

		return getEffectiveEnabledState(peripheral.id, peripheralStateMap, new Map());
	}).length;

	if (definition.peripherals.length === 0) {
		diagnostics.push({
			id: 'no-peripherals',
			level: 'info',
			message: 'The selected MCU definition does not expose any peripherals yet.'
		});
	}

	for (const peripheral of definition.peripherals) {
		if (!overrideBlockedPeripheralIds.has(peripheral.id)) {
			continue;
		}

		diagnostics.push({
			id: `override-disabled-${peripheral.id}`,
			level: 'warning',
			message: `${peripheral.label} was disabled because the current GPIO overrides reserve every valid route.`,
			peripheralId: peripheral.id
		});
	}

	if (effectiveEnabledPeripheralCount === 0) {
		diagnostics.push({
			id: 'no-enabled-peripherals',
			level: 'info',
			message: 'Enable one or more peripherals to start routing signals onto pins.'
		});
	}

	if (!currentSolution && effectiveEnabledPeripheralCount > 0) {
		diagnostics.push({
			id: 'no-valid-solution',
			level: 'error',
			message:
				'No non-conflicting routing exists for the currently enabled peripherals and pin overrides.'
		});
	}

	const peripheralStates: ResolvedPeripheralState[] = definition.peripherals.map((peripheral) => {
		const currentState = peripheralStateMap.get(peripheral.id) ?? {
			peripheralId: peripheral.id,
			enabled: false,
			selectedRoutingOptionId: null,
			routingChoiceKind: 'auto'
		};
		const effectiveEnabled =
			currentState.enabled && !overrideBlockedPeripheralIds.has(peripheral.id);
		const scenarioEnabledOverrides = new Map(effectiveEnabledOverrides);
		scenarioEnabledOverrides.set(peripheral.id, true);
		const optionIds = getRoutingOptionIds(peripheral);
		const enabledScenarioCanSolve = effectiveEnabled
			? currentSolution !== null
			: canSolveScenario(project, {
					enabled: scenarioEnabledOverrides
				});
		const availableRoutingOptionIds =
			effectiveEnabled && peripheral.routingOptions.length
				? optionIds
						.filter((optionId): optionId is string => optionId !== null)
						.filter((optionId) => {
							const solution = getScenarioSolution(project, {
								enabled: scenarioEnabledOverrides,
								hardRoutingOptionIds: new Map([[peripheral.id, optionId]])
							});

							return solution !== null;
						})
				: peripheral.routingOptions.map((option) => option.id);
		const activeSignalIds = getEffectiveEnabledSignalIds(peripheral, currentState);
		const availableSignalIds = effectiveEnabled
			? peripheral.signals
					.filter((signal) => {
						if (signal.required || activeSignalIds.has(signal.id)) {
							return enabledScenarioCanSolve;
						}

						return canSolveScenario(
							withPeripheralSignalEnabled(project, peripheral, signal.id, true),
							{
								enabled: scenarioEnabledOverrides
							}
						);
					})
					.map((signal) => signal.id)
			: enabledScenarioCanSolve
				? peripheral.signals.map((signal) => signal.id)
				: [];
		const hasRoutableSignals = availableSignalIds.length > 0;
		const canEnable = hasRoutableSignals;
		const noRoutableSignals = peripheral.signals.length > 0 && !hasRoutableSignals;
		const signalRoutingStates = peripheral.signals.map((signal) => {
			const optionIds = getSignalRoutingOptionIds(signal);
			const activeRoutingOptionId =
				assignmentByPeripheralSignalKey.get(getSignalRouteKey(peripheral.id, signal.id))
					?.routingOptionId ??
				currentState.selectedSignalRoutingOptionIds?.[signal.id] ??
				null;

			if (optionIds.length === 0) {
				return {
					signalId: signal.id,
					activeRoutingOptionId,
					availableRoutingOptionIds: [],
					impossibleRoutingOptionIds: []
				};
			}

			if (!effectiveEnabled || !availableSignalIds.includes(signal.id)) {
				return {
					signalId: signal.id,
					activeRoutingOptionId,
					availableRoutingOptionIds: optionIds,
					impossibleRoutingOptionIds: []
				};
			}

			const availableRoutingOptionIds = optionIds.filter((optionId) => {
				const scenarioProject = activeSignalIds.has(signal.id)
					? project
					: withPeripheralSignalEnabled(project, peripheral, signal.id, true);
				const solution = getScenarioSolution(scenarioProject, {
					enabled: scenarioEnabledOverrides,
					hardSignalRoutingOptionIds: new Map([
						[getSignalRouteKey(peripheral.id, signal.id), optionId]
					])
				});

				return solution !== null;
			});

			return {
				signalId: signal.id,
				activeRoutingOptionId,
				availableRoutingOptionIds,
				impossibleRoutingOptionIds: optionIds.filter(
					(optionId) => !availableRoutingOptionIds.includes(optionId)
				)
			};
		});

		return {
			peripheralId: peripheral.id,
			enabled: effectiveEnabled,
			canEnable,
			disabledReason: effectiveEnabled
				? noRoutableSignals
					? 'No signals can be routed conflict-free with the current selections.'
					: currentSolution
						? null
						: 'Current selections cannot be solved together.'
				: currentState.enabled && overrideBlockedPeripheralIds.has(peripheral.id)
					? 'GPIO overrides reserve every valid route for this peripheral.'
					: noRoutableSignals
						? 'No signals can be routed conflict-free with the current selections.'
						: canEnable
							? null
							: 'This peripheral definition does not expose any routable signals.',
			activeRoutingOptionId: effectiveEnabled
				? (currentSolution?.activeRoutingOptionIds.get(peripheral.id) ?? null)
				: null,
			availableRoutingOptionIds,
			impossibleRoutingOptionIds: peripheral.routingOptions
				.map((option) => option.id)
				.filter((optionId) => !availableRoutingOptionIds.includes(optionId)),
			availableSignalIds,
			impossibleSignalIds: peripheral.signals
				.map((signal) => signal.id)
				.filter((signalId) => !availableSignalIds.includes(signalId)),
			signalRoutingStates
		};
	});

	const solution: PinmuxSolution = {
		assignments: currentSolution?.assignments ?? [],
		pinStates: buildResolvedPinStates(definition, project, currentSolution?.assignments ?? []),
		peripheralStates
	};

	return {
		ok: currentSolution !== null || effectiveEnabledPeripheralCount === 0,
		message:
			currentSolution !== null || effectiveEnabledPeripheralCount === 0
				? null
				: 'No non-conflicting routing exists for the current selections.',
		diagnostics,
		solution
	};
}
