import {
	addEdge,
	MarkerType,
	type Connection,
	type Edge,
	type Node,
	type XYPosition
} from '@xyflow/svelte';

import { getBlockDefinition } from '$lib/signal-sim/registry';
import type {
	BlockPortDefinition,
	ProjectDocument,
	SimulatorEdgeDocument,
	SimulatorNodeDocument,
	TimingMode
} from '$lib/signal-sim/model';

export type SignalFlowNodeData = Record<string, unknown> & {
	blockType: string;
	title: string;
	shortLabel: string;
	compactGlyph: string;
	noteContent: string;
	category: string;
	description: string;
	label: string;
	inputs: BlockPortDefinition[];
	outputs: BlockPortDefinition[];
	parameterSummary: string[];
	supportsState: boolean;
};

export type SignalFlowNode = Node<SignalFlowNodeData, 'signalBlock'>;
export type SignalFlowEdge = Edge<{ sourcePortId: string; targetPortId: string }>;

function formatParameterSummary(node: SimulatorNodeDocument): string[] {
	const definition = getBlockDefinition(node.blockType);

	if (!definition || definition.parameters.length === 0) {
		return ['No tunable parameters'];
	}

	return definition.parameters.slice(0, 3).map((parameter) => {
		const value = node.parameters[parameter.key] ?? parameter.defaultValue;

		if (parameter.kind === 'textarea') {
			if (parameter.key !== 'csvData') {
				const compactValue = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
				if (!compactValue) {
					return `${parameter.label}: empty`;
				}

				const preview =
					compactValue.length > 40 ? `${compactValue.slice(0, 37).trimEnd()}...` : compactValue;
				return `${parameter.label}: ${preview}`;
			}

			const rowCount =
				typeof value === 'string'
					? value
						.split(/\r?\n/)
						.filter((line) => line.trim().length > 0 && !line.trim().startsWith('#')).length
					: 0;
			return `${parameter.label}: ${rowCount} row${rowCount === 1 ? '' : 's'}`;
		}

		const suffix = parameter.unit ? ` ${parameter.unit}` : '';
		if (typeof value === 'string') {
			const compactValue = value.replace(/\s+/g, ' ').trim();
			const preview =
				compactValue.length > 28 ? `${compactValue.slice(0, 25).trimEnd()}...` : compactValue;
			return `${parameter.label}: ${preview}${suffix}`;
		}

		return `${parameter.label}: ${value}${suffix}`;
	});
}

function formatCompactGlyph(node: SimulatorNodeDocument): string {
	const definition = getBlockDefinition(node.blockType);

	if (!definition) {
		return '?';
	}

	if (node.blockType === 'gain') {
		const gainValue = node.parameters.gain;
		if (typeof gainValue === 'number' && Number.isFinite(gainValue)) {
			if (Math.abs(gainValue) >= 1000 || (Math.abs(gainValue) > 0 && Math.abs(gainValue) < 0.01)) {
				return gainValue.toExponential(1);
			}

			const rounded = Number(gainValue.toFixed(2));
			return `${rounded}`;
		}
	}

	return definition.shortLabel;
}

function toFlowNode(node: SimulatorNodeDocument, selectedNodeId: string | null): SignalFlowNode {
	const definition = getBlockDefinition(node.blockType);

	if (!definition) {
		throw new Error(`Unknown block type: ${node.blockType}`);
	}

	return {
		id: node.id,
		type: 'signalBlock',
		position: node.position,
		data: {
			blockType: definition.type,
			title: definition.title,
			shortLabel: definition.shortLabel,
			compactGlyph: formatCompactGlyph(node),
			noteContent:
				typeof node.parameters.content === 'string' ? node.parameters.content : '',
			category: definition.category,
			description: definition.description,
			label: node.label,
			inputs: definition.inputs,
			outputs: definition.outputs,
			parameterSummary: formatParameterSummary(node),
			supportsState: definition.supportsState
		},
		selected: node.id === selectedNodeId,
		focusable: true,
		deletable: true,
		selectable: true,
		draggable: true
	};
}

export function toFlowNodes(
	nodes: SimulatorNodeDocument[],
	selectedNodeId: string | null = null
): SignalFlowNode[] {
	return nodes.map((node) => toFlowNode(node, selectedNodeId));
}

export function toFlowEdges(
	edges: SimulatorEdgeDocument[],
	selectedEdgeId: string | null = null
): SignalFlowEdge[] {
	return edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourcePortId,
		targetHandle: edge.targetPortId,
		label: edge.label,
		type: 'smoothstep',
		markerEnd: { type: MarkerType.ArrowClosed },
		selected: edge.id === selectedEdgeId,
		data: {
			sourcePortId: edge.sourcePortId,
			targetPortId: edge.targetPortId
		}
	}));
}

export function flowEdgeToDocumentEdge(edge: SignalFlowEdge): SimulatorEdgeDocument | null {
	if (!edge.sourceHandle || !edge.targetHandle) {
		return null;
	}

	return {
		id: edge.id,
		source: edge.source,
		sourcePortId: edge.sourceHandle,
		target: edge.target,
		targetPortId: edge.targetHandle,
		label: typeof edge.label === 'string' ? edge.label : undefined
	};
}

function getNodePort(
	nodes: SignalFlowNode[],
	nodeId: string | null | undefined,
	handleId: string | null | undefined,
	direction: 'input' | 'output'
): BlockPortDefinition | undefined {
	if (!nodeId || !handleId) {
		return undefined;
	}

	const node = nodes.find((candidate) => candidate.id === nodeId);
	const portList = direction === 'output' ? node?.data.outputs : node?.data.inputs;

	return portList?.find((port) => port.id === handleId);
}

function isTimingCompatible(source: TimingMode, target: TimingMode): boolean {
	return source === target || source === 'hybrid' || target === 'hybrid';
}

export function isConnectionCompatible(
	connection: Connection,
	nodes: SignalFlowNode[],
	edges: SignalFlowEdge[] = []
): boolean {
	const sourcePort = getNodePort(nodes, connection.source, connection.sourceHandle, 'output');
	const targetPort = getNodePort(nodes, connection.target, connection.targetHandle, 'input');

	if (!sourcePort || !targetPort) {
		return false;
	}

	if (sourcePort.signalKind !== targetPort.signalKind) {
		return false;
	}

	if (!isTimingCompatible(sourcePort.timingMode, targetPort.timingMode)) {
		return false;
	}

	return !edges.some(
		(edge) =>
			edge.source === connection.source &&
			edge.target === connection.target &&
			edge.sourceHandle === connection.sourceHandle &&
			edge.targetHandle === connection.targetHandle
	);
}

export function addConnectionToFlowEdges(
	edges: SignalFlowEdge[],
	connection: Connection
): SignalFlowEdge[] {
	return addEdge(
		{
			...connection,
			type: 'smoothstep',
			markerEnd: { type: MarkerType.ArrowClosed }
		},
		edges
	);
}

export function createDocumentEdgeFromConnection(connection: Connection): SimulatorEdgeDocument | null {
	if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
		return null;
	}

	return {
		id: crypto.randomUUID(),
		source: connection.source,
		sourcePortId: connection.sourceHandle,
		target: connection.target,
		targetPortId: connection.targetHandle
	};
}

export function mergeNodePositions(
	project: ProjectDocument,
	nodes: Array<{ id: string; position: XYPosition }>
): ProjectDocument {
	const nodePositionLookup = new Map(nodes.map((node) => [node.id, node.position]));

	return {
		...project,
		nodes: project.nodes.map((node) => ({
			...node,
			position: nodePositionLookup.get(node.id) ?? node.position
		}))
	};
}

export function describePort(port: BlockPortDefinition): string {
	return `${port.label} - ${port.signalKind} - ${port.timingMode}`;
}