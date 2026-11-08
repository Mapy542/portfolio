import { getEffectiveEnabledSignalIds, getSignalRoutingOptionIds } from '#lib/pinmux/model.js';
import type {
	McuDefinitionDocument,
	PeripheralInstance,
	PeripheralProjectState,
	PeripheralSignal,
	PeripheralSignalCandidate,
	PinProjectState,
	PinmuxProjectDocument
} from '#lib/pinmux/model.js';
import type {
	PinmuxDiagnostic,
	PinmuxSolution,
	ResolvedPeripheralState,
	ResolvedPinState,
	ResolvedSignalAssignment
} from '#lib/pinmux/worker-types.js';

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

interface SolverSlot {
	peripheralIndex: number;
	signalId: string;
	selectedSignalRoutingOptionId: string | null;
	// Per peripheral routing option: candidate pin indices and their source candidates.
	optionPins: number[][];
	optionCandidates: PeripheralSignalCandidate[][];
	// Union of all option pins, used as a relaxation while the peripheral route is undecided.
	relaxedPins: number[];
}

interface SolverPeripheral {
	peripheral: PeripheralInstance;
	optionIds: Array<string | null>;
	slotIndices: number[];
}

interface MatchingState {
	choice: Int32Array;
	slotPin: Int32Array;
	pinSlot: Int32Array;
}

// Signals-to-pins is bipartite matching once each peripheral's routing option is fixed, so only
// peripheral-level routing options are branched on; each branch is pruned by a relaxed matching.
function findSolution(
	definition: McuDefinitionDocument,
	project: PinmuxProjectDocument,
	overrides: SearchOverrides = {}
): SolveBranch | null {
	const peripheralStateMap = getPeripheralStateMap(project);
	const enabledOverrides = overrides.enabled ?? new Map<string, boolean>();
	const hardRoutingOptionIds = overrides.hardRoutingOptionIds ?? new Map<string, string | null>();
	const hardSignalRoutingOptionIds =
		overrides.hardSignalRoutingOptionIds ?? new Map<string, string>();
	const reservedPins = new Set(
		project.pinStates
			.filter((pinState) => pinState.overrideMode !== 'auto')
			.map((pinState) => pinState.pinId)
	);
	const pinIndexById = new Map<string, number>();
	const pinIdByIndex: string[] = [];
	const getPinIndex = (pinId: string): number => {
		let index = pinIndexById.get(pinId);

		if (index === undefined) {
			index = pinIdByIndex.length;
			pinIndexById.set(pinId, index);
			pinIdByIndex.push(pinId);
		}

		return index;
	};

	const solverPeripherals: SolverPeripheral[] = [];
	const slots: SolverSlot[] = [];

	for (const peripheral of definition.peripherals) {
		if (!getEffectiveEnabledState(peripheral.id, peripheralStateMap, enabledOverrides)) {
			continue;
		}

		const optionIds = getOrderedRoutingOptionIds(
			peripheral,
			peripheralStateMap,
			hardRoutingOptionIds
		);

		if (optionIds.length === 0) {
			return null;
		}

		const peripheralIndex = solverPeripherals.length;
		const slotIndices: number[] = [];

		for (const signal of getActiveSignals(peripheral, peripheralStateMap)) {
			const selectedSignalRoutingOptionId = getSelectedSignalRoutingOptionId(
				peripheral.id,
				signal.id,
				peripheralStateMap,
				hardSignalRoutingOptionIds
			);
			const optionPins: number[][] = [];
			const optionCandidates: PeripheralSignalCandidate[][] = [];
			const relaxedPinSet = new Set<number>();

			for (const optionId of optionIds) {
				const pins: number[] = [];
				const candidates: PeripheralSignalCandidate[] = [];
				const seenPins = new Set<number>();

				for (const candidate of getSignalCandidates(
					signal,
					optionId,
					selectedSignalRoutingOptionId
				)) {
					if (reservedPins.has(candidate.pinId)) {
						continue;
					}

					const pinIndex = getPinIndex(candidate.pinId);

					if (seenPins.has(pinIndex)) {
						continue;
					}

					seenPins.add(pinIndex);
					relaxedPinSet.add(pinIndex);
					pins.push(pinIndex);
					candidates.push(candidate);
				}

				optionPins.push(pins);
				optionCandidates.push(candidates);
			}

			if (relaxedPinSet.size === 0) {
				return null;
			}

			slotIndices.push(slots.length);
			slots.push({
				peripheralIndex,
				signalId: signal.id,
				selectedSignalRoutingOptionId,
				optionPins,
				optionCandidates,
				relaxedPins: Array.from(relaxedPinSet)
			});
		}

		solverPeripherals.push({ peripheral, optionIds, slotIndices });
	}

	const pinCount = pinIdByIndex.length;
	const visitStamp = new Int32Array(pinCount);
	let currentStamp = 0;

	const getAllowedPins = (slotIndex: number, choice: Int32Array): number[] => {
		const slot = slots[slotIndex];
		const chosen = choice[slot.peripheralIndex];

		return chosen === -1 ? slot.relaxedPins : slot.optionPins[chosen];
	};

	const tryAugment = (slotIndex: number, state: MatchingState): boolean => {
		for (const pinIndex of getAllowedPins(slotIndex, state.choice)) {
			if (visitStamp[pinIndex] === currentStamp) {
				continue;
			}

			visitStamp[pinIndex] = currentStamp;
			const owner = state.pinSlot[pinIndex];

			if (owner === -1 || tryAugment(owner, state)) {
				state.pinSlot[pinIndex] = slotIndex;
				state.slotPin[slotIndex] = pinIndex;
				return true;
			}
		}

		return false;
	};

	const matchSlot = (slotIndex: number, state: MatchingState): boolean => {
		currentStamp += 1;
		return tryAugment(slotIndex, state);
	};

	const rootState: MatchingState = {
		choice: new Int32Array(solverPeripherals.length).fill(-1),
		slotPin: new Int32Array(slots.length).fill(-1),
		pinSlot: new Int32Array(pinCount).fill(-1)
	};

	solverPeripherals.forEach((entry, index) => {
		if (entry.optionIds.length === 1) {
			rootState.choice[index] = 0;
		}
	});

	// Match the most constrained signals first so the greedy choice keeps preferred pins stable.
	const rootOrder = slots
		.map((_, index) => index)
		.sort(
			(left, right) =>
				getAllowedPins(left, rootState.choice).length -
				getAllowedPins(right, rootState.choice).length
		);

	for (const slotIndex of rootOrder) {
		if (!matchSlot(slotIndex, rootState)) {
			return null;
		}
	}

	const branchOrder = solverPeripherals
		.map((entry, index) => ({ index, optionCount: entry.optionIds.length }))
		.filter((entry) => entry.optionCount > 1)
		.sort((left, right) => left.optionCount - right.optionCount || left.index - right.index)
		.map((entry) => entry.index);

	const search = (depth: number, state: MatchingState): MatchingState | null => {
		if (depth === branchOrder.length) {
			return state;
		}

		const peripheralIndex = branchOrder[depth];
		const { slotIndices, optionIds } = solverPeripherals[peripheralIndex];

		for (let optionIndex = 0; optionIndex < optionIds.length; optionIndex += 1) {
			const nextState: MatchingState = {
				choice: state.choice.slice(),
				slotPin: state.slotPin.slice(),
				pinSlot: state.pinSlot.slice()
			};
			nextState.choice[peripheralIndex] = optionIndex;

			const unmatched: number[] = [];

			for (const slotIndex of slotIndices) {
				const pinIndex = nextState.slotPin[slotIndex];

				if (!slots[slotIndex].optionPins[optionIndex].includes(pinIndex)) {
					if (pinIndex !== -1) {
						nextState.pinSlot[pinIndex] = -1;
					}

					nextState.slotPin[slotIndex] = -1;
					unmatched.push(slotIndex);
				}
			}

			if (!unmatched.every((slotIndex) => matchSlot(slotIndex, nextState))) {
				continue;
			}

			const result = search(depth + 1, nextState);

			if (result) {
				return result;
			}
		}

		return null;
	};

	const finalState = search(0, rootState);

	if (!finalState) {
		return null;
	}

	const assignments: ResolvedSignalAssignment[] = [];
	const activeRoutingOptionIds = new Map<string, string | null>();

	solverPeripherals.forEach((entry, peripheralIndex) => {
		const optionIndex = finalState.choice[peripheralIndex];
		const optionId = entry.optionIds[optionIndex] ?? null;

		activeRoutingOptionIds.set(entry.peripheral.id, optionId);

		for (const slotIndex of entry.slotIndices) {
			const slot = slots[slotIndex];
			const pinIndex = finalState.slotPin[slotIndex];
			const candidate =
				slot.optionCandidates[optionIndex][slot.optionPins[optionIndex].indexOf(pinIndex)];

			assignments.push({
				peripheralId: entry.peripheral.id,
				signalId: slot.signalId,
				pinId: candidate.pinId,
				af: candidate.af,
				routingOptionId:
					slot.selectedSignalRoutingOptionId ?? optionId ?? candidate.routingOptionIds[0] ?? null
			});
		}
	});

	return { assignments, activeRoutingOptionIds };
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
