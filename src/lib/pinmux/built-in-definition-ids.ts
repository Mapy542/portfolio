const definitionModules = import.meta.glob('../data/mcu/*.json');

function getBuiltInDefinitionIdFromModulePath(modulePath: string): string | null {
	const fileName = modulePath.split('/').at(-1);

	if (!fileName?.endsWith('.json')) {
		return null;
	}

	const baseId = fileName.slice(0, -'.json'.length);

	return baseId.startsWith('ch32') ? `wch-${baseId}` : baseId;
}

export const builtInDefinitionIds = new Set(
	Object.keys(definitionModules)
		.map((modulePath) => getBuiltInDefinitionIdFromModulePath(modulePath))
		.filter((definitionId): definitionId is string => definitionId !== null)
);

export function isBuiltInDefinitionId(id: string | null): boolean {
	return !!id && builtInDefinitionIds.has(id);
}
