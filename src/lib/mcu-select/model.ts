import { z } from 'zod';

import { mcuDefinitionSchema, packageKindValues } from '$lib/pinmux/model';

export const MCU_SELECT_PROJECT_VERSION = 1;
export const mcuSelectSortModeValues = ['best-fit-smallest-package'] as const;
export const mcuSelectEthernetSpeedValues = ['10m', '10-100', '1g'] as const;
export const mcuSelectEthernetMacInterfaceValues = ['mii', 'rmii', 'rgmii', 'sgmii'] as const;

export type McuSelectSortMode = (typeof mcuSelectSortModeValues)[number];
export type McuSelectEthernetSpeed = (typeof mcuSelectEthernetSpeedValues)[number];
export type McuSelectEthernetMacInterface = (typeof mcuSelectEthernetMacInterfaceValues)[number];

export const mcuSelectRequirementSchema = z.object({
	groupId: z.string().min(1),
	minimumCount: z.number().int().nonnegative()
});

export const mcuSelectPackageFiltersSchema = z.object({
	minPinCount: z.number().int().positive().nullable(),
	maxPinCount: z.number().int().positive().nullable(),
	includePackageKinds: z.array(z.enum(packageKindValues)),
	excludePackageKinds: z.array(z.enum(packageKindValues))
});

export const mcuSelectEthernetPhyFilterSchema = z.object({
	minimumCount: z.number().int().nonnegative().default(0),
	speeds: z.array(z.enum(mcuSelectEthernetSpeedValues)).default([])
});

export const mcuSelectEthernetMacFilterSchema = z.object({
	minimumCount: z.number().int().nonnegative().default(0),
	speeds: z.array(z.enum(mcuSelectEthernetSpeedValues)).default([]),
	interfaces: z.array(z.enum(mcuSelectEthernetMacInterfaceValues)).default([])
});

export const mcuSelectEthernetFiltersSchema = z.object({
	phy: mcuSelectEthernetPhyFilterSchema.default({
		minimumCount: 0,
		speeds: []
	}),
	mac: mcuSelectEthernetMacFilterSchema.default({
		minimumCount: 0,
		speeds: [],
		interfaces: []
	})
});

export const mcuSelectProjectMetaSchema = z.object({
	name: z.string().min(1),
	createdAt: z.string().min(1),
	updatedAt: z.string().min(1)
});

export const mcuSelectProjectDocumentSchema = z.object({
	version: z.literal(MCU_SELECT_PROJECT_VERSION),
	meta: mcuSelectProjectMetaSchema,
	requirements: z.array(mcuSelectRequirementSchema),
	packageFilters: mcuSelectPackageFiltersSchema,
	ethernetFilters: mcuSelectEthernetFiltersSchema.default({
		phy: {
			minimumCount: 0,
			speeds: []
		},
		mac: {
			minimumCount: 0,
			speeds: [],
			interfaces: []
		}
	}),
	favoriteDefinitionIds: z.array(z.string().min(1)).default([]),
	showCloseMatches: z.boolean(),
	sortMode: z.enum(mcuSelectSortModeValues),
	customDefinitions: z.array(mcuDefinitionSchema)
});

export type McuSelectRequirement = z.infer<typeof mcuSelectRequirementSchema>;
export type McuSelectPackageFilters = z.infer<typeof mcuSelectPackageFiltersSchema>;
export type McuSelectEthernetPhyFilter = z.infer<typeof mcuSelectEthernetPhyFilterSchema>;
export type McuSelectEthernetMacFilter = z.infer<typeof mcuSelectEthernetMacFilterSchema>;
export type McuSelectEthernetFilters = z.infer<typeof mcuSelectEthernetFiltersSchema>;
export type McuSelectProjectMeta = z.infer<typeof mcuSelectProjectMetaSchema>;
export type McuSelectProjectDocument = z.infer<typeof mcuSelectProjectDocumentSchema>;

export function createMcuSelectProjectMeta(name = 'MCU Select Search'): McuSelectProjectMeta {
	const timestamp = new Date().toISOString();

	return {
		name,
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createEmptyMcuSelectProjectDocument(): McuSelectProjectDocument {
	return {
		version: MCU_SELECT_PROJECT_VERSION,
		meta: createMcuSelectProjectMeta(),
		requirements: [],
		packageFilters: {
			minPinCount: null,
			maxPinCount: null,
			includePackageKinds: [],
			excludePackageKinds: []
		},
		ethernetFilters: {
			phy: {
				minimumCount: 0,
				speeds: []
			},
			mac: {
				minimumCount: 0,
				speeds: [],
				interfaces: []
			}
		},
		favoriteDefinitionIds: [],
		showCloseMatches: false,
		sortMode: 'best-fit-smallest-package',
		customDefinitions: []
	};
}

export function stampMcuSelectProjectDocument(
	project: McuSelectProjectDocument
): McuSelectProjectDocument {
	return {
		...project,
		meta: {
			...project.meta,
			updatedAt: new Date().toISOString()
		}
	};
}

export function parseMcuSelectProjectDocumentJson(json: string): McuSelectProjectDocument {
	return mcuSelectProjectDocumentSchema.parse(JSON.parse(json));
}

export function serializeMcuSelectProjectDocument(project: McuSelectProjectDocument): string {
	return JSON.stringify(mcuSelectProjectDocumentSchema.parse(project), null, 2);
}

export function normalizeMcuSelectRequirements(
	requirements: Iterable<McuSelectRequirement> | null | undefined
): McuSelectRequirement[] {
	if (!requirements) {
		return [];
	}

	const countByGroupId = new Map<string, number>();

	for (const requirement of requirements) {
		if (!requirement.groupId) {
			continue;
		}

		countByGroupId.set(
			requirement.groupId,
			Math.max(requirement.minimumCount, countByGroupId.get(requirement.groupId) ?? 0)
		);
	}

	return [...countByGroupId.entries()]
		.map(([groupId, minimumCount]) => ({ groupId, minimumCount }))
		.sort((left, right) => left.groupId.localeCompare(right.groupId));
}
