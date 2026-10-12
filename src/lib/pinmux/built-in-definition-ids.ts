const definitionIds = import.meta.glob<string>('../data/mcu/*.json', {
	eager: true,
	import: 'id'
});

export const builtInDefinitionIds = new Set(Object.values(definitionIds));

export function isBuiltInDefinitionId(id: string | null): boolean {
	return !!id && builtInDefinitionIds.has(id);
}
