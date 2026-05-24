import { z } from 'zod';

export const PINMUX_PROJECT_VERSION = 1;

export const pinOverrideModeValues = ['auto', 'gpio-input', 'gpio-output', 'analog'] as const;
export const packageKindValues = ['quad', 'dual-row', 'bga'] as const;
export const routingChoiceKindValues = ['auto', 'explicit'] as const;

export type PinOverrideMode = (typeof pinOverrideModeValues)[number];
export type PackageKind = (typeof packageKindValues)[number];
export type RoutingChoiceKind = (typeof routingChoiceKindValues)[number];

export const packageDefinitionSchema = z.object({
	name: z.string().min(1),
	kind: z.enum(packageKindValues),
	pinCount: z.number().int().positive(),
	numbering: z.enum(['ccw', 'cw']),
	orientationMark: z.enum(['top-left', 'top-center']),
	pinsPerSide: z.number().int().positive().nullable(),
	rowPinCount: z.number().int().positive().nullable(),
	bodyLabel: z.string().min(1)
});

export const physicalPinDefinitionSchema = z.object({
	id: z.string().min(1),
	packageNumber: z.string().min(1),
	name: z.string().min(1),
	supportedModes: z.array(z.enum(pinOverrideModeValues)).min(1)
});

export const routingOptionSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	description: z.string().optional()
});

export const peripheralSignalCandidateSchema = z.object({
	pinId: z.string().min(1),
	af: z.string().nullable(),
	routingOptionIds: z.array(z.string()),
	notes: z.string().optional()
});

export const peripheralSignalSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	required: z.boolean(),
	defaultEnabled: z.boolean().optional(),
	candidates: z.array(peripheralSignalCandidateSchema).min(1)
});

export const peripheralInstanceSchema = z.object({
	id: z.string().min(1),
	family: z.string().min(1),
	label: z.string().min(1),
	description: z.string(),
	colorHint: z.string().nullable(),
	routingOptions: z.array(routingOptionSchema),
	signals: z.array(peripheralSignalSchema).min(1)
});

export const mcuDefinitionSchema = z.object({
	id: z.string().min(1),
	vendor: z.string().min(1),
	family: z.string().min(1),
	name: z.string().min(1),
	version: z.string().min(1),
	description: z.string(),
	package: packageDefinitionSchema,
	pins: z.array(physicalPinDefinitionSchema).min(1),
	peripherals: z.array(peripheralInstanceSchema)
});

export const pinProjectStateSchema = z.object({
	pinId: z.string().min(1),
	overrideMode: z.enum(pinOverrideModeValues),
	label: z.string()
});

export const peripheralProjectStateSchema = z.object({
	peripheralId: z.string().min(1),
	enabled: z.boolean(),
	selectedRoutingOptionId: z.string().nullable(),
	routingChoiceKind: z.enum(routingChoiceKindValues),
	enabledSignalIds: z.array(z.string().min(1)).optional(),
	selectedSignalRoutingOptionIds: z.record(z.string(), z.string()).optional()
});

export const pinmuxProjectMetaSchema = z.object({
	name: z.string().min(1),
	createdAt: z.string().min(1),
	updatedAt: z.string().min(1)
});

export const pinmuxProjectDocumentSchema = z.object({
	version: z.literal(PINMUX_PROJECT_VERSION),
	meta: pinmuxProjectMetaSchema,
	selectedDefinitionId: z.string().nullable(),
	embeddedDefinition: mcuDefinitionSchema.nullable(),
	peripheralStates: z.array(peripheralProjectStateSchema),
	pinStates: z.array(pinProjectStateSchema)
});

export type PackageDefinition = z.infer<typeof packageDefinitionSchema>;
export type PhysicalPinDefinition = z.infer<typeof physicalPinDefinitionSchema>;
export type RoutingOption = z.infer<typeof routingOptionSchema>;
export type PeripheralSignalCandidate = z.infer<typeof peripheralSignalCandidateSchema>;
export type PeripheralSignal = z.infer<typeof peripheralSignalSchema>;
export type PeripheralInstance = z.infer<typeof peripheralInstanceSchema>;
export type McuDefinitionDocument = z.infer<typeof mcuDefinitionSchema>;
export type PinProjectState = z.infer<typeof pinProjectStateSchema>;
export type PeripheralProjectState = z.infer<typeof peripheralProjectStateSchema>;
export type PinmuxProjectMeta = z.infer<typeof pinmuxProjectMetaSchema>;
export type PinmuxProjectDocument = z.infer<typeof pinmuxProjectDocumentSchema>;

export function createPinmuxProjectMeta(name = 'Pinmux Workspace'): PinmuxProjectMeta {
	const timestamp = new Date().toISOString();

	return {
		name,
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createEmptyPinmuxProjectDocument(
	selectedDefinitionId: string | null = null
): PinmuxProjectDocument {
	return {
		version: PINMUX_PROJECT_VERSION,
		meta: createPinmuxProjectMeta(),
		selectedDefinitionId,
		embeddedDefinition: null,
		peripheralStates: [],
		pinStates: []
	};
}

export function stampPinmuxProjectDocument(project: PinmuxProjectDocument): PinmuxProjectDocument {
	return {
		...project,
		meta: {
			...project.meta,
			updatedAt: new Date().toISOString()
		}
	};
}

export function parseMcuDefinitionDocumentJson(json: string): McuDefinitionDocument {
	return mcuDefinitionSchema.parse(JSON.parse(json));
}

export function serializeMcuDefinitionDocument(definition: McuDefinitionDocument): string {
	return JSON.stringify(mcuDefinitionSchema.parse(definition), null, 2);
}

export function parsePinmuxProjectDocumentJson(json: string): PinmuxProjectDocument {
	return pinmuxProjectDocumentSchema.parse(JSON.parse(json));
}

export function serializePinmuxProjectDocument(project: PinmuxProjectDocument): string {
	return JSON.stringify(pinmuxProjectDocumentSchema.parse(project), null, 2);
}

export function isSignalEnabledByDefault(signal: PeripheralSignal): boolean {
	if (signal.required) {
		return true;
	}

	return signal.defaultEnabled ?? true;
}

export function getOptionalSignalIds(peripheral: PeripheralInstance): string[] {
	return peripheral.signals.filter((signal) => !signal.required).map((signal) => signal.id);
}

export function getSignalRoutingOptionIds(signal: PeripheralSignal): string[] {
	return Array.from(
		new Set(signal.candidates.flatMap((candidate) => candidate.routingOptionIds))
	).sort((left, right) => left.localeCompare(right));
}

export function normalizeEnabledSignalIds(
	peripheral: PeripheralInstance,
	signalIds: Iterable<string> | null | undefined
): string[] | undefined {
	if (signalIds === null || signalIds === undefined) {
		return undefined;
	}

	const optionalSignalIds = new Set(getOptionalSignalIds(peripheral));
	const normalized = Array.from(new Set(signalIds)).filter((signalId) => optionalSignalIds.has(signalId));

	return normalized;
}

export function normalizeSelectedSignalRoutingOptionIds(
	peripheral: PeripheralInstance,
	selectedSignalRoutingOptionIds:
		| Record<string, string>
		| null
		| undefined
): Record<string, string> | undefined {
	if (!selectedSignalRoutingOptionIds) {
		return undefined;
	}

	const signalOptionIdsBySignalId = new Map(
		peripheral.signals.map((signal) => [signal.id, new Set(getSignalRoutingOptionIds(signal))])
	);
	const normalizedEntries = Object.entries(selectedSignalRoutingOptionIds).filter(
		([signalId, routingOptionId]) => signalOptionIdsBySignalId.get(signalId)?.has(routingOptionId)
	);

	return normalizedEntries.length > 0 ? Object.fromEntries(normalizedEntries) : undefined;
}

export function getEffectiveEnabledSignalIds(
	peripheral: PeripheralInstance,
	peripheralState: PeripheralProjectState | null | undefined
): Set<string> {
	const hasExplicitSignalSelection = peripheralState?.enabledSignalIds !== undefined;
	const explicitEnabledSignalIds = new Set(
		normalizeEnabledSignalIds(peripheral, peripheralState?.enabledSignalIds) ?? []
	);

	return new Set(
		peripheral.signals
			.filter((signal) => {
				if (signal.required) {
					return true;
				}

				if (hasExplicitSignalSelection) {
					return explicitEnabledSignalIds.has(signal.id);
				}

				return isSignalEnabledByDefault(signal);
			})
			.map((signal) => signal.id)
	);
}