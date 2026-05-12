import { z } from 'zod';

export const SIGNAL_SIM_PROJECT_VERSION = 1;

export const signalKindValues = ['scalar', 'boolean', 'vector'] as const;
export const timingModeValues = ['continuous', 'discrete', 'hybrid'] as const;
export const parameterEditorKindValues = ['number', 'text', 'textarea', 'boolean', 'select'] as const;
export const outputKindValues = ['value', 'plot'] as const;

export type SignalKind = (typeof signalKindValues)[number];
export type TimingMode = (typeof timingModeValues)[number];
export type ParameterEditorKind = (typeof parameterEditorKindValues)[number];
export type OutputKind = (typeof outputKindValues)[number];
export type BlockParameterValue = string | number | boolean | null;

export interface BlockPortDefinition {
	id: string;
	label: string;
	direction: 'input' | 'output';
	signalKind: SignalKind;
	timingMode: TimingMode;
	description?: string;
	required?: boolean;
}

export interface BlockParameterOption {
	label: string;
	value: string;
}

export interface BlockParameterDefinition {
	key: string;
	label: string;
	kind: ParameterEditorKind;
	defaultValue: BlockParameterValue;
	description?: string;
	placeholder?: string;
	unit?: string;
	min?: number;
	max?: number;
	step?: number;
	options?: BlockParameterOption[];
}

export interface BlockDefinition {
	type: string;
	title: string;
	shortLabel: string;
	category: string;
	description: string;
	tags: string[];
	supportsState: boolean;
	inputs: BlockPortDefinition[];
	outputs: BlockPortDefinition[];
	parameters: BlockParameterDefinition[];
}

const parameterValueSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);

export const simulationConfigSchema = z.object({
	duration: z.number().positive(),
	stepSize: z.number().positive(),
	playbackRate: z.number().positive(),
	sampleDecimation: z.number().int().positive()
});

export const simulatorNodeSchema = z.object({
	id: z.string().min(1),
	blockType: z.string().min(1),
	label: z.string().min(1),
	position: z.object({
		x: z.number().finite(),
		y: z.number().finite()
	}),
	parameters: z.record(z.string(), parameterValueSchema)
});

export const simulatorEdgeSchema = z.object({
	id: z.string().min(1),
	source: z.string().min(1),
	sourcePortId: z.string().min(1),
	target: z.string().min(1),
	targetPortId: z.string().min(1),
	label: z.string().optional()
});

export const outputDefinitionSchema = z.object({
	id: z.string().min(1),
	kind: z.enum(outputKindValues),
	label: z.string().min(1),
	sourceNodeId: z.string().nullable(),
	sourcePortId: z.string().nullable(),
	color: z.string().nullable()
});

export const projectMetaSchema = z.object({
	name: z.string().min(1),
	description: z.string(),
	createdAt: z.string().min(1),
	updatedAt: z.string().min(1)
});

export const projectDocumentSchema = z.object({
	version: z.literal(SIGNAL_SIM_PROJECT_VERSION),
	meta: projectMetaSchema,
	simulation: simulationConfigSchema,
	nodes: z.array(simulatorNodeSchema),
	edges: z.array(simulatorEdgeSchema),
	outputs: z.array(outputDefinitionSchema)
});

export type SimulationConfig = z.infer<typeof simulationConfigSchema>;
export type SimulatorNodeDocument = z.infer<typeof simulatorNodeSchema>;
export type SimulatorEdgeDocument = z.infer<typeof simulatorEdgeSchema>;
export type OutputDefinition = z.infer<typeof outputDefinitionSchema>;
export type ProjectMeta = z.infer<typeof projectMetaSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

export function createDefaultSimulationConfig(): SimulationConfig {
	return {
		duration: 0.25,
		stepSize: 0.0005,
		playbackRate: 1,
		sampleDecimation: 1
	};
}

export function createProjectMeta(name = 'Signal System Workspace'): ProjectMeta {
	const timestamp = new Date().toISOString();

	return {
		name,
		description: 'Client-side signal and system editor scaffold.',
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createEmptyProjectDocument(name = 'Signal System Workspace'): ProjectDocument {
	return {
		version: SIGNAL_SIM_PROJECT_VERSION,
		meta: createProjectMeta(name),
		simulation: createDefaultSimulationConfig(),
		nodes: [],
		edges: [],
		outputs: []
	};
}

export function stampProjectDocument(project: ProjectDocument): ProjectDocument {
	return {
		...project,
		meta: {
			...project.meta,
			updatedAt: new Date().toISOString()
		}
	};
}

export function parseProjectDocumentJson(json: string): ProjectDocument {
	return projectDocumentSchema.parse(JSON.parse(json));
}

export function serializeProjectDocument(project: ProjectDocument): string {
	return JSON.stringify(projectDocumentSchema.parse(project), null, 2);
}