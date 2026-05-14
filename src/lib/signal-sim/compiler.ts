import type { ProjectDocument } from '$lib/signal-sim/model';
import { getBlockDefinition } from '$lib/signal-sim/registry';
import {
	createSignalKey,
	type CompiledNode,
	type CompiledNodePhase,
	type CompiledProject,
	type CompiledPortConnection,
	type CompiledSignalDescriptor,
	type SimulationDiagnostic
} from '$lib/signal-sim/worker-types';

const statefulBlockTypes = new Set([
	'integrator',
	'delay',
	'sample-delay',
	'zero-order-hold',
	'inverter-bldc',
	'encoder'
]);
const algebraicBlockTypes = new Set([
	'gain',
	'signal-clamp',
	'sum',
	'sum-3',
	'sum-4',
	'route-pin',
	'differentiator',
	'clarke',
	'park',
	'inverse-park',
	'inverse-clarke'
]);
const sinkBlockTypes = new Set(['probe', 'note']);

const LARGE_SIMULATION_SAMPLE_COUNT = 250_000;
const MAX_SIMULATION_SAMPLE_COUNT = 1_000_000;
const LARGE_SIMULATION_VALUE_COUNT = 10_000_000;
const MAX_SIMULATION_VALUE_COUNT = 25_000_000;

function classifyNodePhase(blockType: string): CompiledNodePhase {
	if (statefulBlockTypes.has(blockType)) {
		return 'stateful';
	}

	if (algebraicBlockTypes.has(blockType)) {
		return 'algebraic';
	}

	if (sinkBlockTypes.has(blockType)) {
		return 'sink';
	}

	return 'source';
}

function createDiagnostic(
	id: string,
	level: SimulationDiagnostic['level'],
	message: string,
	context: { nodeId?: string; edgeId?: string } = {}
): SimulationDiagnostic {
	return {
		id,
		level,
		message,
		...context
	};
}

function topologicalSort(
	graphNodes: Set<string>,
	adjacency: Map<string, Set<string>>,
	indegree: Map<string, number>
): string[] {
	const order: string[] = [];
	const queue = [...graphNodes].filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0);

	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (!nodeId) {
			continue;
		}

		order.push(nodeId);

		for (const targetId of adjacency.get(nodeId) ?? []) {
			const nextDegree = (indegree.get(targetId) ?? 0) - 1;
			indegree.set(targetId, nextDegree);
			if (nextDegree === 0) {
				queue.push(targetId);
			}
		}
	}

	return order;
}

export function compileProject(project: ProjectDocument): CompiledProject {
	const diagnostics: SimulationDiagnostic[] = [];
	const compiledNodes: CompiledNode[] = [];
	const nodeLookup = new Map(project.nodes.map((node) => [node.id, node]));
	const compiledNodeLookup = new Map<string, CompiledNode>();
	const signalDescriptors: CompiledSignalDescriptor[] = [];
	const evaluationNodeIds = new Set<string>();
	const statefulNodeIds: string[] = [];
	const sourceNodeIds: string[] = [];

	for (const node of project.nodes) {
		const definition = getBlockDefinition(node.blockType);
		if (!definition) {
			diagnostics.push(
				createDiagnostic(
					`missing-block-${node.id}`,
					'error',
					`Node "${node.label}" references an unknown block type: ${node.blockType}.`,
					{ nodeId: node.id }
				)
			);
			continue;
		}

		const phase = classifyNodePhase(node.blockType);
		const compiledNode: CompiledNode = {
			id: node.id,
			blockType: node.blockType,
			label: node.label,
			phase,
			parameters: { ...node.parameters },
			inputConnections: Object.fromEntries(definition.inputs.map((port) => [port.id, null])),
			outputPortIds: definition.outputs.map((port) => port.id)
		};

		for (const port of definition.outputs) {
			signalDescriptors.push({
				key: createSignalKey(node.id, port.id),
				nodeId: node.id,
				portId: port.id,
				label: `${node.label} ${port.label}`,
				signalKind: port.signalKind,
				timingMode: port.timingMode
			});
		}

		if (phase === 'stateful') {
			statefulNodeIds.push(node.id);
		} else if (phase === 'source') {
			sourceNodeIds.push(node.id);
		} else {
			evaluationNodeIds.add(node.id);
		}

		compiledNodes.push(compiledNode);
		compiledNodeLookup.set(node.id, compiledNode);
	}

	for (const edge of project.edges) {
		const sourceNode = nodeLookup.get(edge.source);
		const targetNode = nodeLookup.get(edge.target);
		const sourceDefinition = sourceNode ? getBlockDefinition(sourceNode.blockType) : undefined;
		const targetDefinition = targetNode ? getBlockDefinition(targetNode.blockType) : undefined;

		if (!sourceNode || !sourceDefinition) {
			diagnostics.push(
				createDiagnostic(
					`edge-source-${edge.id}`,
					'error',
					`Edge "${edge.id}" points to a missing source node.`,
					{ edgeId: edge.id }
				)
			);
			continue;
		}

		if (!targetNode || !targetDefinition) {
			diagnostics.push(
				createDiagnostic(
					`edge-target-${edge.id}`,
					'error',
					`Edge "${edge.id}" points to a missing target node.`,
					{ edgeId: edge.id }
				)
			);
			continue;
		}

		const sourcePort = sourceDefinition.outputs.find((port) => port.id === edge.sourcePortId);
		const targetPort = targetDefinition.inputs.find((port) => port.id === edge.targetPortId);

		if (!sourcePort) {
			diagnostics.push(
				createDiagnostic(
					`edge-source-port-${edge.id}`,
					'error',
					`Source port "${edge.sourcePortId}" does not exist on "${sourceNode.label}".`,
					{ edgeId: edge.id, nodeId: edge.source }
				)
			);
			continue;
		}

		if (!targetPort) {
			diagnostics.push(
				createDiagnostic(
					`edge-target-port-${edge.id}`,
					'error',
					`Target port "${edge.targetPortId}" does not exist on "${targetNode.label}".`,
					{ edgeId: edge.id, nodeId: edge.target }
				)
			);
			continue;
		}

		const compiledTargetNode = compiledNodeLookup.get(edge.target);
		if (!compiledTargetNode) {
			continue;
		}

		if (compiledTargetNode.inputConnections[edge.targetPortId]) {
			diagnostics.push(
				createDiagnostic(
					`duplicate-input-${edge.id}`,
					'error',
					`Input port "${targetPort.label}" on "${targetNode.label}" has more than one incoming wire.`,
					{ edgeId: edge.id, nodeId: edge.target }
				)
			);
			continue;
		}

		compiledTargetNode.inputConnections[edge.targetPortId] = {
			edgeId: edge.id,
			sourceNodeId: edge.source,
			sourcePortId: edge.sourcePortId,
			targetNodeId: edge.target,
			targetPortId: edge.targetPortId,
			signalKey: createSignalKey(edge.source, edge.sourcePortId)
		} satisfies CompiledPortConnection;
	}

	for (const compiledNode of compiledNodes) {
		const definition = getBlockDefinition(compiledNode.blockType);
		if (!definition) {
			continue;
		}

		for (const inputPort of definition.inputs) {
			if (!compiledNode.inputConnections[inputPort.id]) {
				diagnostics.push(
					createDiagnostic(
						`unbound-input-${compiledNode.id}-${inputPort.id}`,
						'warning',
						`Input "${inputPort.label}" on "${compiledNode.label}" is unbound and will default to 0 during simulation.`,
						{ nodeId: compiledNode.id }
					)
				);
			}
		}
	}

	const evaluationAdjacency = new Map<string, Set<string>>();
	const evaluationIndegree = new Map<string, number>();

	for (const nodeId of evaluationNodeIds) {
		evaluationAdjacency.set(nodeId, new Set());
		evaluationIndegree.set(nodeId, 0);
	}

	for (const compiledNode of compiledNodes) {
		if (!evaluationNodeIds.has(compiledNode.id)) {
			continue;
		}

		for (const connection of Object.values(compiledNode.inputConnections)) {
			if (!connection || !evaluationNodeIds.has(connection.sourceNodeId)) {
				continue;
			}

			const targets = evaluationAdjacency.get(connection.sourceNodeId);
			if (!targets || targets.has(compiledNode.id)) {
				continue;
			}

			targets.add(compiledNode.id);
			evaluationIndegree.set(
				compiledNode.id,
				(evaluationIndegree.get(compiledNode.id) ?? 0) + 1
			);
		}
	}

	const evaluationOrder = topologicalSort(
		evaluationNodeIds,
		evaluationAdjacency,
		new Map(evaluationIndegree)
	);

	if (evaluationOrder.length !== evaluationNodeIds.size) {
		const cyclicNodeIds = [...evaluationNodeIds].filter((nodeId) => !evaluationOrder.includes(nodeId));
		const cyclicLabels = cyclicNodeIds
			.map((nodeId) => compiledNodeLookup.get(nodeId)?.label ?? nodeId)
			.join(', ');

		diagnostics.push(
			createDiagnostic(
				'algebraic-loop',
				'error',
				`The current compiler found an algebraic loop among: ${cyclicLabels}. Add a stateful boundary such as a delay, integrator, or ZOH before running.`
			)
		);
	}

	const sampleCount = Math.max(1, Math.floor(project.simulation.duration / project.simulation.stepSize) + 1);
	const projectedValueCount = sampleCount * (signalDescriptors.length + 1);

	if (
		sampleCount > MAX_SIMULATION_SAMPLE_COUNT ||
		projectedValueCount > MAX_SIMULATION_VALUE_COUNT
	) {
		diagnostics.push(
			createDiagnostic(
				'simulation-sample-cap',
				'error',
				`This run would generate ${sampleCount.toLocaleString()} time samples and store about ${projectedValueCount.toLocaleString()} values across the timeline and signal traces. That exceeds the current in-browser safety cap. Increase the step size or shorten the duration before running.`
			)
		);
	} else if (
		sampleCount > LARGE_SIMULATION_SAMPLE_COUNT ||
		projectedValueCount > LARGE_SIMULATION_VALUE_COUNT
	) {
		diagnostics.push(
			createDiagnostic(
				'simulation-sample-warning',
				'warning',
				`This run will generate ${sampleCount.toLocaleString()} time samples and store about ${projectedValueCount.toLocaleString()} values across the timeline and signal traces. Large runs can become slow or memory-heavy in the browser.`
			)
		);
	}

	const summary = {
		projectName: project.meta.name,
		nodeCount: compiledNodes.length,
		edgeCount: project.edges.length,
		signalCount: signalDescriptors.length,
		sampleCount,
		duration: project.simulation.duration,
		stepSize: project.simulation.stepSize,
		evaluationOrder,
		statefulNodeIds,
		hasErrors: diagnostics.some((diagnostic) => diagnostic.level === 'error')
	};

	return {
		project,
		simulation: project.simulation,
		nodes: compiledNodes,
		sourceNodeIds,
		statefulNodeIds,
		evaluationOrder,
		signals: signalDescriptors,
		outputs: project.outputs,
		diagnostics,
		summary
	};
}