import { mcuDefinitionSchema, type McuDefinitionDocument } from '$lib/pinmux/model';

export { isBuiltInDefinitionId } from './built-in-definition-ids';

const definitionModules = import.meta.glob('../data/mcu/*.json', {
	eager: true
}) as Record<string, { default: unknown }>;

const builtInDefinitions = Object.values(definitionModules)
	.map((module) => mcuDefinitionSchema.parse(module.default))
	.sort((left, right) =>
		`${left.vendor} ${left.name}`.localeCompare(`${right.vendor} ${right.name}`)
	);

export function getBuiltInDefinitions(): McuDefinitionDocument[] {
	return builtInDefinitions;
}

export function getBuiltInDefinitionById(id: string | null): McuDefinitionDocument | null {
	if (!id) {
		return null;
	}

	return builtInDefinitions.find((definition) => definition.id === id) ?? null;
}
