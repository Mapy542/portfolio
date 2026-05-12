import type {
	BlockParameterValue,
	OutputDefinition,
	ProjectDocument,
	SignalKind,
	SimulationConfig,
	TimingMode
} from '$lib/signal-sim/model';

export type SimulationDiagnosticLevel = 'info' | 'warning' | 'error';
export type CompiledNodePhase = 'source' | 'stateful' | 'algebraic' | 'sink';

export interface SimulationDiagnostic {
	id: string;
	level: SimulationDiagnosticLevel;
	message: string;
	nodeId?: string;
	edgeId?: string;
}

export interface CompiledPortConnection {
	edgeId: string;
	sourceNodeId: string;
	sourcePortId: string;
	targetNodeId: string;
	targetPortId: string;
	signalKey: string;
}

export interface CompiledNode {
	id: string;
	blockType: string;
	label: string;
	phase: CompiledNodePhase;
	parameters: Record<string, BlockParameterValue>;
	inputConnections: Record<string, CompiledPortConnection | null>;
	outputPortIds: string[];
}

export interface CompiledSignalDescriptor {
	key: string;
	nodeId: string;
	portId: string;
	label: string;
	signalKind: SignalKind;
	timingMode: TimingMode;
}

export interface CompiledProjectSummary {
	projectName: string;
	nodeCount: number;
	edgeCount: number;
	signalCount: number;
	sampleCount: number;
	duration: number;
	stepSize: number;
	evaluationOrder: string[];
	statefulNodeIds: string[];
	hasErrors: boolean;
}

export interface CompiledProject {
	project: ProjectDocument;
	simulation: SimulationConfig;
	nodes: CompiledNode[];
	sourceNodeIds: string[];
	statefulNodeIds: string[];
	evaluationOrder: string[];
	signals: CompiledSignalDescriptor[];
	outputs: OutputDefinition[];
	diagnostics: SimulationDiagnostic[];
	summary: CompiledProjectSummary;
}

export interface SimulationSeries {
	key: string;
	nodeId: string;
	portId: string;
	label: string;
	signalKind: SignalKind;
	timingMode: TimingMode;
	values: number[];
}

export interface SimulationRunPayload {
	compiled: CompiledProjectSummary;
	diagnostics: SimulationDiagnostic[];
	times: number[];
	series: SimulationSeries[];
}

export interface SimulationRunRequest {
	requestId: string;
	project: ProjectDocument;
}

export interface SimulationRunSuccess extends SimulationRunPayload {
	requestId: string;
	ok: true;
}

export interface SimulationRunFailure {
	requestId: string;
	ok: false;
	compiled: CompiledProjectSummary;
	diagnostics: SimulationDiagnostic[];
	message: string;
}

export type SimulationRunResponse = SimulationRunSuccess | SimulationRunFailure;

export function createSignalKey(nodeId: string, portId: string): string {
	return `${nodeId}:${portId}`;
}