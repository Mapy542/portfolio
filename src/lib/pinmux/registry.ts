import { mcuDefinitionSchema, type McuDefinitionDocument } from '$lib/pinmux/model';

const definitionModules = import.meta.glob('../data/mcu/*.json', {
	eager: true
}) as Record<string, { default: unknown }>;

const builtInDefinitions = Object.values(definitionModules)
	.map((module) => mcuDefinitionSchema.parse(module.default))
	.sort((left, right) => `${left.vendor} ${left.name}`.localeCompare(`${right.vendor} ${right.name}`));

const builtInDefinitionIds = new Set(builtInDefinitions.map((definition) => definition.id));

export function getBuiltInDefinitions(): McuDefinitionDocument[] {
	return builtInDefinitions;
}

export function getBuiltInDefinitionById(id: string | null): McuDefinitionDocument | null {
	if (!id) {
		return null;
	}

	return builtInDefinitions.find((definition) => definition.id === id) ?? null;
}

export function isBuiltInDefinitionId(id: string | null): boolean {
	return !!id && builtInDefinitionIds.has(id);
}