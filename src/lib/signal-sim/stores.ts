import { browser } from '$app/environment';
import { derived, get, writable } from 'svelte/store';
import type { Connection, XYPosition } from '@xyflow/svelte';

import {
	projectDocumentSchema,
	stampProjectDocument,
	type BlockParameterValue,
	type OutputDefinition,
	type ProjectDocument,
	type SimulationConfig,
	type SimulatorNodeDocument
} from '$lib/signal-sim/model';
import { createDocumentEdgeFromConnection } from '$lib/signal-sim/flow';
import {
	createExampleProjectDocument,
	createNodeFromBlock,
	createOutputDefinition,
	getBlockCatalog,
	getBlockDefinition
} from '$lib/signal-sim/registry';
import type {
	CompiledProjectSummary,
	SimulationDiagnostic,
	SimulationRunResponse,
	SimulationRunSuccess
} from '$lib/signal-sim/worker-types';

export type SelectionState = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null;
export type ValidationLevel = 'info' | 'warning' | 'error';

export interface ValidationMessage {
	id: string;
	level: ValidationLevel;
	message: string;
}

export type SimulationRunState =
	| 'editor-foundation'
	| 'stale'
	| 'compiling'
	| 'ready'
	| 'error';

export interface SignalOption {
	key: string;
	nodeId: string;
	portId: string;
	nodeLabel: string;
	portLabel: string;
	signalKind: string;
	timingMode: string;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function buildDefaultPosition(index: number): XYPosition {
	const column = index % 3;
	const row = Math.floor(index / 3);

	return {
		x: 60 + column * 280,
		y: 90 + row * 180
	};
}

function validateProject(project: ProjectDocument): ValidationMessage[] {
	const messages: ValidationMessage[] = [];

	if (project.nodes.length === 0) {
		messages.push({
			id: 'empty-project',
			level: 'info',
			message: 'Start by adding a source, arithmetic block, or timing primitive from the palette.'
		});
	}

	if (project.outputs.length === 0) {
		messages.push({
			id: 'no-outputs',
			level: 'info',
			message: 'Add at least one output to bind a plotted or sampled signal.'
		});
	}

	if (project.simulation.stepSize >= project.simulation.duration) {
		messages.push({
			id: 'step-vs-duration',
			level: 'warning',
			message: 'Step size is greater than or equal to the simulation duration, so the run will contain a single sample.'
		});
	}

	for (const output of project.outputs) {
		if (!output.sourceNodeId || !output.sourcePortId) {
			messages.push({
				id: `output-unbound-${output.id}`,
				level: 'warning',
				message: `${output.label} is not bound to a signal yet.`
			});
			continue;
		}

		const node = project.nodes.find((candidate) => candidate.id === output.sourceNodeId);
		const definition = node ? getBlockDefinition(node.blockType) : undefined;
		const port = definition?.outputs.find((candidate) => candidate.id === output.sourcePortId);

		if (!node || !port) {
			messages.push({
				id: `output-invalid-${output.id}`,
				level: 'error',
				message: `${output.label} references a missing signal port.`
			});
		}
	}

	return messages;
}

function projectSignalOptions(project: ProjectDocument): SignalOption[] {
	return project.nodes.flatMap((node) => {
		const definition = getBlockDefinition(node.blockType);
		if (!definition) {
			return [];
		}

		return definition.outputs.map((port) => ({
			key: `${node.id}:${port.id}`,
			nodeId: node.id,
			portId: port.id,
			nodeLabel: node.label,
			portLabel: port.label,
			signalKind: port.signalKind,
			timingMode: port.timingMode
		}));
	});
}

function pruneProjectForDeletedNodes(project: ProjectDocument, nodeIds: Set<string>): ProjectDocument {
	return {
		...project,
		nodes: project.nodes.filter((node) => !nodeIds.has(node.id)),
		edges: project.edges.filter(
			(edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target)
		),
		outputs: project.outputs.filter(
			(output) => !output.sourceNodeId || !nodeIds.has(output.sourceNodeId)
		)
	};
}

function mapSimulationDiagnostic(diagnostic: SimulationDiagnostic): ValidationMessage {
	return {
		id: diagnostic.id,
		level: diagnostic.level,
		message: diagnostic.message
	};
}

export function createSignalSimEditorStore(initialProject = createExampleProjectDocument()) {
	const project = writable<ProjectDocument>(initialProject);
	const selection = writable<SelectionState>(null);
	const currentTime = writable(0);
	const playing = writable(false);
	const runState = writable<SimulationRunState>('editor-foundation');
	const simulationResult = writable<SimulationRunSuccess | null>(null);
	const simulationSummary = writable<CompiledProjectSummary | null>(null);
	const simulationDiagnostics = writable<SimulationDiagnostic[]>([]);
	const simulationErrorMessage = writable<string | null>(null);
	const needsRun = writable(true);

	let simulationWorker: Worker | null = null;
	let activeRequestId: string | null = null;
	let activeRunPromise: Promise<boolean> | null = null;
	let resolveActiveRun: ((ok: boolean) => void) | null = null;

	function settleActiveRun(ok: boolean) {
		const resolver = resolveActiveRun;
		activeRequestId = null;
		activeRunPromise = null;
		resolveActiveRun = null;
		resolver?.(ok);
	}

	function handleWorkerResponse(response: SimulationRunResponse) {
		simulationSummary.set(response.compiled);
		simulationDiagnostics.set(response.diagnostics);

		if (response.ok) {
			simulationResult.set(response);
			simulationErrorMessage.set(null);
			needsRun.set(false);
			runState.set('ready');
			currentTime.set(clamp(get(currentTime), 0, response.compiled.duration));
			settleActiveRun(true);
			return;
		}

		simulationResult.set(null);
		simulationErrorMessage.set(response.message);
		needsRun.set(true);
		runState.set('error');
		settleActiveRun(false);
	}

	function ensureWorker(): Worker | null {
		if (!browser) {
			return null;
		}

		if (!simulationWorker) {
			simulationWorker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
				type: 'module'
			});

			simulationWorker.addEventListener('message', (event: MessageEvent<SimulationRunResponse>) => {
				if (event.data.requestId !== activeRequestId) {
					return;
				}

				handleWorkerResponse(event.data);
			});

			simulationWorker.addEventListener('error', (event) => {
				simulationResult.set(null);
				simulationSummary.set(null);
				simulationDiagnostics.set([
					{
						id: 'worker-crash',
						level: 'error',
						message: event.message || 'The simulation worker crashed while evaluating the graph.'
					}
				]);
				simulationErrorMessage.set('The simulation worker crashed while evaluating the graph.');
				needsRun.set(true);
				runState.set('error');
				settleActiveRun(false);
			});
		}

		return simulationWorker;
	}

	const selectedNode = derived([project, selection], ([$project, $selection]) => {
		if ($selection?.kind !== 'node') {
			return null;
		}

		return $project.nodes.find((node) => node.id === $selection.id) ?? null;
	});

	const selectedEdge = derived([project, selection], ([$project, $selection]) => {
		if ($selection?.kind !== 'edge') {
			return null;
		}

		return $project.edges.find((edge) => edge.id === $selection.id) ?? null;
	});

	const availableSignals = derived(project, ($project) => projectSignalOptions($project));
	const validationMessages = derived([project, simulationDiagnostics], ([$project, $simulationDiagnostics]) => [
		...validateProject($project),
		...$simulationDiagnostics.map(mapSimulationDiagnostic)
	]);
	const graphStats = derived(project, ($project) => ({
		nodes: $project.nodes.length,
		edges: $project.edges.length,
		outputs: $project.outputs.length
	}));
	const currentSampleIndex = derived(
		[currentTime, simulationSummary, project],
		([$currentTime, $simulationSummary, $project]) => {
			const stepSize = $simulationSummary?.stepSize ?? $project.simulation.stepSize;
			const sampleCount =
				$simulationSummary?.sampleCount ??
				Math.max(1, Math.floor($project.simulation.duration / $project.simulation.stepSize) + 1);

			return clamp(Math.round($currentTime / stepSize), 0, Math.max(0, sampleCount - 1));
		}
	);
	const currentSignalValues = derived(
		[simulationResult, currentSampleIndex],
		([$simulationResult, $currentSampleIndex]) => {
			const signalValues: Record<string, number> = {};

			for (const series of $simulationResult?.series ?? []) {
				signalValues[series.key] = series.values[$currentSampleIndex] ?? 0;
			}

			return signalValues;
		}
	);

	function finalizeProject(nextProject: ProjectDocument, clampTimeToDuration = true): ProjectDocument {
		const stampedProject = stampProjectDocument(nextProject);
		const activeSelection = get(selection);
		const hadPriorRun = get(simulationSummary) !== null;

		if (activeSelection?.kind === 'node') {
			if (!stampedProject.nodes.some((node) => node.id === activeSelection.id)) {
				selection.set(null);
			}
		} else if (activeSelection?.kind === 'edge') {
			if (!stampedProject.edges.some((edge) => edge.id === activeSelection.id)) {
				selection.set(null);
			}
		}

		if (clampTimeToDuration) {
			currentTime.set(clamp(get(currentTime), 0, stampedProject.simulation.duration));
		}

		playing.set(false);
		simulationResult.set(null);
		simulationSummary.set(null);
		simulationDiagnostics.set([]);
		simulationErrorMessage.set(null);
		needsRun.set(true);
		runState.set(hadPriorRun ? 'stale' : 'editor-foundation');

		return stampedProject;
	}

	function applyProjectUpdate(
		mutator: (draft: ProjectDocument) => ProjectDocument,
		options: { clampTimeToDuration?: boolean } = {}
	) {
		project.update((current) =>
			finalizeProject(mutator(structuredClone(current)), options.clampTimeToDuration ?? true)
		);
	}

	function setSelection(nextSelection: SelectionState) {
		selection.set(nextSelection);
	}

	function addBlock(blockType: string, position?: XYPosition): SimulatorNodeDocument | null {
		let createdNode: SimulatorNodeDocument | null = null;

		applyProjectUpdate((draft) => {
			createdNode = createNodeFromBlock(blockType, position ?? buildDefaultPosition(draft.nodes.length));

			if (createdNode) {
				draft.nodes.push(createdNode);
			}

			return draft;
		});

		const nextCreatedNode = createdNode;

		if (nextCreatedNode) {
			selection.set({ kind: 'node', id: nextCreatedNode.id });
		}

		return nextCreatedNode;
	}

	function addConnection(connection: Connection) {
		applyProjectUpdate((draft) => {
			const nextEdge = createDocumentEdgeFromConnection(connection);

			if (!nextEdge) {
				return draft;
			}

			const duplicateExists = draft.edges.some(
				(edge) =>
					edge.source === nextEdge.source &&
					edge.target === nextEdge.target &&
					edge.sourcePortId === nextEdge.sourcePortId &&
					edge.targetPortId === nextEdge.targetPortId
			);

			if (!duplicateExists) {
				draft.edges.push(nextEdge);
				selection.set({ kind: 'edge', id: nextEdge.id });
			}

			return draft;
		});
	}

	function syncNodePositions(nodes: Array<{ id: string; position: XYPosition }>) {
		if (nodes.length === 0) {
			return;
		}

		applyProjectUpdate((draft) => {
			const positionLookup = new Map(nodes.map((node) => [node.id, node.position]));
			draft.nodes = draft.nodes.map((node) => ({
				...node,
				position: positionLookup.get(node.id) ?? node.position
			}));
			return draft;
		}, { clampTimeToDuration: false });
	}

	function removeElementsById(nodeIds: string[], edgeIds: string[]) {
		applyProjectUpdate((draft) => {
			if (nodeIds.length > 0) {
				draft = pruneProjectForDeletedNodes(draft, new Set(nodeIds));
			}

			if (edgeIds.length > 0) {
				const edgeIdSet = new Set(edgeIds);
				draft.edges = draft.edges.filter((edge) => !edgeIdSet.has(edge.id));
			}

			return draft;
		});
	}

	function removeSelection() {
		const activeSelection = get(selection);

		if (!activeSelection) {
			return;
		}

		if (activeSelection.kind === 'node') {
			removeElementsById([activeSelection.id], []);
			return;
		}

		removeElementsById([], [activeSelection.id]);
	}

	function updateNodeLabel(nodeId: string, label: string) {
		applyProjectUpdate((draft) => {
			draft.nodes = draft.nodes.map((node) =>
				node.id === nodeId ? { ...node, label: label.trim() || node.label } : node
			);
			return draft;
		});
	}

	function updateNodeParameter(nodeId: string, key: string, value: BlockParameterValue) {
		applyProjectUpdate((draft) => {
			draft.nodes = draft.nodes.map((node) =>
				node.id === nodeId
					? {
						...node,
						parameters: {
							...node.parameters,
							[key]: value
						}
					}
					: node
			);
			return draft;
		});
	}

	function updateEdgeLabel(edgeId: string, label: string) {
		applyProjectUpdate((draft) => {
			draft.edges = draft.edges.map((edge) =>
				edge.id === edgeId
					? {
						...edge,
						label: label.trim() || undefined
					}
					: edge
			);
			return draft;
		});
	}

	function updateSimulationConfig(patch: Partial<SimulationConfig>) {
		applyProjectUpdate((draft) => {
			draft.simulation = {
				...draft.simulation,
				...patch
			};
			return draft;
		});
	}

	function addOutput(seed?: { nodeId: string; portId: string; label?: string }): OutputDefinition {
		let nextOutput = createOutputDefinition(get(project), seed);

		applyProjectUpdate((draft) => {
			nextOutput = createOutputDefinition(draft, seed);
			draft.outputs.push(nextOutput);
			return draft;
		});

		return nextOutput;
	}

	function updateOutput(outputId: string, patch: Partial<OutputDefinition>) {
		applyProjectUpdate((draft) => {
			draft.outputs = draft.outputs.map((output) =>
				output.id === outputId ? { ...output, ...patch } : output
			);
			return draft;
		});
	}

	function removeOutput(outputId: string) {
		applyProjectUpdate((draft) => {
			draft.outputs = draft.outputs.filter((output) => output.id !== outputId);
			return draft;
		});
	}

	function replaceProjectDocument(nextProject: ProjectDocument) {
		const parsedProject = projectDocumentSchema.parse(nextProject);
		playing.set(false);
		selection.set(null);
		currentTime.set(0);
		project.set(finalizeProject(parsedProject));
	}

	function runSimulation(force = false): Promise<boolean> {
		if (!browser) {
			return Promise.resolve(false);
		}

		if (!force && !get(needsRun) && get(simulationResult)) {
			runState.set('ready');
			return Promise.resolve(true);
		}

		if (activeRunPromise) {
			return activeRunPromise;
		}

		const worker = ensureWorker();
		if (!worker) {
			simulationErrorMessage.set('The simulation worker is unavailable in this environment.');
			runState.set('error');
			return Promise.resolve(false);
		}

		const requestId = crypto.randomUUID();
		activeRequestId = requestId;
		runState.set('compiling');
		simulationErrorMessage.set(null);
		simulationDiagnostics.set([]);

		activeRunPromise = new Promise<boolean>((resolve) => {
			resolveActiveRun = resolve;
			worker.postMessage({ requestId, project: get(project) });
		});

		return activeRunPromise;
	}

	function resetProject() {
		replaceProjectDocument(createExampleProjectDocument());
	}

	function setProjectName(name: string) {
		applyProjectUpdate((draft) => {
			draft.meta.name = name.trim() || draft.meta.name;
			return draft;
		});
	}

	function setCurrentTimeValue(value: number) {
		currentTime.set(clamp(value, 0, get(project).simulation.duration));
	}

	function setPlayingValue(value: boolean) {
		playing.set(value);
	}

	function destroy() {
		if (simulationWorker) {
			simulationWorker.terminate();
			simulationWorker = null;
		}

		if (activeRunPromise) {
			settleActiveRun(false);
		}
	}

	return {
		project,
		selection,
		currentTime,
		playing,
		runState,
		needsRun,
		simulationResult,
		simulationSummary,
		simulationErrorMessage,
		currentSampleIndex,
		currentSignalValues,
		selectedNode,
		selectedEdge,
		availableSignals,
		validationMessages,
		graphStats,
		blockCatalog: getBlockCatalog(),
		addBlock,
		addConnection,
		syncNodePositions,
		removeElementsById,
		removeSelection,
		updateNodeLabel,
		updateNodeParameter,
		updateEdgeLabel,
		updateSimulationConfig,
		addOutput,
		updateOutput,
		removeOutput,
		replaceProjectDocument,
		resetProject,
		runSimulation,
		setSelection,
		setCurrentTime: setCurrentTimeValue,
		setPlaying: setPlayingValue,
		setProjectName,
		destroy
	};
}