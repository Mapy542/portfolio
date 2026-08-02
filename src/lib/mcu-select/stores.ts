import { derived, get, writable } from 'svelte/store';

import { parseMcuDefinitionDocumentJson, serializeMcuDefinitionDocument } from '$lib/pinmux/model';
import { getBuiltInDefinitions } from '$lib/pinmux/registry';

import { buildMcuSelectCatalog } from './catalog';
import { buildMcuSelectMatchSections } from './matcher';
import {
	buildPinmuxProjectJsonFromMcuSelectMatch,
	buildPinmuxProjectUrlFromMcuSelectMatch
} from './pinmux-bridge';
import {
	createEmptyMcuSelectProjectDocument,
	mcuSelectEthernetMacInterfaceValues,
	parseMcuSelectProjectDocumentJson,
	serializeMcuSelectProjectDocument,
	stampMcuSelectProjectDocument,
	type McuSelectProjectDocument
} from './model';

function clampCount(value: number): number {
	return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function sortDefinitions<T extends { vendor: string; name: string }>(definitions: T[]): T[] {
	return [...definitions].sort((left, right) =>
		`${left.vendor} ${left.name}`.localeCompare(`${right.vendor} ${right.name}`, undefined, {
			numeric: true
		})
	);
}

function upsertCustomDefinition(
	project: McuSelectProjectDocument,
	definition: ReturnType<typeof parseMcuDefinitionDocumentJson>
): McuSelectProjectDocument {
	const customDefinitions = sortDefinitions([
		...project.customDefinitions.filter((candidate) => candidate.id !== definition.id),
		definition
	]);

	return {
		...project,
		customDefinitions
	};
}

function replaceProject(nextProject: McuSelectProjectDocument) {
	return stampMcuSelectProjectDocument(nextProject);
}

function toggleStringValue(values: string[], value: string, enabled: boolean): string[] {
	return enabled
		? [...new Set([...values, value])].sort()
		: values.filter((candidate) => candidate !== value);
}

export function createMcuSelectStore() {
	const builtInDefinitions = getBuiltInDefinitions();
	const project = writable<McuSelectProjectDocument>(createEmptyMcuSelectProjectDocument());
	const selectedResultId = writable<string | null>(null);
	let cachedCustomDefinitions = get(project).customDefinitions;
	let cachedDefinitionCatalog = sortDefinitions(builtInDefinitions);
	let cachedCatalog = buildMcuSelectCatalog(cachedDefinitionCatalog);

	const definitionCatalog = derived(project, ($project) => {
		if ($project.customDefinitions === cachedCustomDefinitions) {
			return cachedDefinitionCatalog;
		}

		cachedCustomDefinitions = $project.customDefinitions;
		cachedDefinitionCatalog = sortDefinitions([
			...builtInDefinitions.filter(
				(definition) => !$project.customDefinitions.some((custom) => custom.id === definition.id)
			),
			...$project.customDefinitions
		]);

		return cachedDefinitionCatalog;
	});

	const catalog = derived(definitionCatalog, ($definitionCatalog) => {
		if ($definitionCatalog === cachedDefinitionCatalog) {
			return cachedCatalog;
		}

		cachedDefinitionCatalog = $definitionCatalog;
		cachedCatalog = buildMcuSelectCatalog($definitionCatalog);
		return cachedCatalog;
	});

	const groupDefinitions = derived(catalog, ($catalog) => $catalog.groups);
	const projectName = derived(project, ($project) => $project.meta.name);
	const matchSections = derived([catalog, project], ([$catalog, $project]) =>
		buildMcuSelectMatchSections($catalog, $project)
	);
	const selectedResult = derived(
		[catalog, selectedResultId],
		([$catalog, $selectedResultId]) =>
			$catalog.records.find((record) => record.definition.id === $selectedResultId) ?? null
	);

	function updateProject(mutator: (current: McuSelectProjectDocument) => McuSelectProjectDocument) {
		project.update((current) => replaceProject(mutator(current)));
	}

	function setProjectName(name: string) {
		updateProject((current) => ({
			...current,
			meta: {
				...current.meta,
				name
			}
		}));
	}

	function setShowCloseMatches(showCloseMatches: boolean) {
		updateProject((current) => ({
			...current,
			showCloseMatches
		}));
	}

	function setRequirementMinimum(groupId: string, minimumCount: number) {
		const nextCount = clampCount(minimumCount);

		updateProject((current) => {
			const requirements = current.requirements.filter(
				(requirement) => requirement.groupId !== groupId
			);

			if (nextCount > 0) {
				requirements.push({ groupId, minimumCount: nextCount });
			}

			return {
				...current,
				requirements: requirements.sort((left, right) => left.groupId.localeCompare(right.groupId))
			};
		});
	}

	function setMinPinCount(value: number | null) {
		updateProject((current) => ({
			...current,
			packageFilters: {
				...current.packageFilters,
				minPinCount: value && value > 0 ? Math.floor(value) : null
			}
		}));
	}

	function setMaxPinCount(value: number | null) {
		updateProject((current) => ({
			...current,
			packageFilters: {
				...current.packageFilters,
				maxPinCount: value && value > 0 ? Math.floor(value) : null
			}
		}));
	}

	function setEthernetPhyMinimum(minimumCount: number) {
		updateProject((current) => ({
			...current,
			ethernetFilters: {
				...current.ethernetFilters,
				phy: {
					...current.ethernetFilters.phy,
					minimumCount: clampCount(minimumCount)
				}
			}
		}));
	}

	function setEthernetMacMinimum(minimumCount: number) {
		updateProject((current) => ({
			...current,
			ethernetFilters: {
				...current.ethernetFilters,
				mac: {
					...current.ethernetFilters.mac,
					minimumCount: clampCount(minimumCount)
				}
			}
		}));
	}

	function setEthernetPhySpeedEnabled(
		speed: McuSelectProjectDocument['ethernetFilters']['phy']['speeds'][number],
		enabled: boolean
	) {
		updateProject((current) => ({
			...current,
			ethernetFilters: {
				...current.ethernetFilters,
				phy: {
					...current.ethernetFilters.phy,
					speeds: toggleStringValue(
						current.ethernetFilters.phy.speeds,
						speed,
						enabled
					) as typeof current.ethernetFilters.phy.speeds
				}
			}
		}));
	}

	function setEthernetMacSpeedEnabled(
		speed: McuSelectProjectDocument['ethernetFilters']['mac']['speeds'][number],
		enabled: boolean
	) {
		updateProject((current) => ({
			...current,
			ethernetFilters: {
				...current.ethernetFilters,
				mac: {
					...current.ethernetFilters.mac,
					speeds: toggleStringValue(
						current.ethernetFilters.mac.speeds,
						speed,
						enabled
					) as typeof current.ethernetFilters.mac.speeds
				}
			}
		}));
	}

	function setEthernetMacInterfaceEnabled(
		value: (typeof mcuSelectEthernetMacInterfaceValues)[number],
		enabled: boolean
	) {
		updateProject((current) => ({
			...current,
			ethernetFilters: {
				...current.ethernetFilters,
				mac: {
					...current.ethernetFilters.mac,
					interfaces: toggleStringValue(
						current.ethernetFilters.mac.interfaces,
						value,
						enabled
					) as typeof current.ethernetFilters.mac.interfaces
				}
			}
		}));
	}

	function setPackageKindIncluded(
		packageKind: McuSelectProjectDocument['packageFilters']['includePackageKinds'][number],
		included: boolean
	) {
		updateProject((current) => {
			const includePackageKinds = included
				? [...new Set([...current.packageFilters.includePackageKinds, packageKind])]
				: current.packageFilters.includePackageKinds.filter(
						(candidate) => candidate !== packageKind
					);
			const excludePackageKinds = current.packageFilters.excludePackageKinds.filter(
				(candidate) => candidate !== packageKind
			);

			return {
				...current,
				packageFilters: {
					...current.packageFilters,
					includePackageKinds,
					excludePackageKinds
				}
			};
		});
	}

	function setPackageKindExcluded(
		packageKind: McuSelectProjectDocument['packageFilters']['excludePackageKinds'][number],
		excluded: boolean
	) {
		updateProject((current) => {
			const excludePackageKinds = excluded
				? [...new Set([...current.packageFilters.excludePackageKinds, packageKind])]
				: current.packageFilters.excludePackageKinds.filter(
						(candidate) => candidate !== packageKind
					);
			const includePackageKinds = current.packageFilters.includePackageKinds.filter(
				(candidate) => candidate !== packageKind
			);

			return {
				...current,
				packageFilters: {
					...current.packageFilters,
					includePackageKinds,
					excludePackageKinds
				}
			};
		});
	}

	function clearPackageFilters() {
		updateProject((current) => ({
			...current,
			packageFilters: {
				minPinCount: null,
				maxPinCount: null,
				includePackageKinds: [],
				excludePackageKinds: []
			}
		}));
	}

	function clearAllFilters() {
		updateProject((current) => ({
			...current,
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
			}
		}));
	}

	function toggleFavorite(definitionId: string) {
		updateProject((current) => {
			const favoriteDefinitionIds = current.favoriteDefinitionIds.includes(definitionId)
				? current.favoriteDefinitionIds.filter((candidate) => candidate !== definitionId)
				: [...current.favoriteDefinitionIds, definitionId].sort((left, right) =>
						left.localeCompare(right, undefined, { numeric: true })
					);

			return {
				...current,
				favoriteDefinitionIds
			};
		});
		selectedResultId.set(definitionId);
	}

	function importDefinitionJson(json: string) {
		const definition = parseMcuDefinitionDocumentJson(json);
		updateProject((current) => upsertCustomDefinition(current, definition));
		selectedResultId.set(definition.id);
	}

	function exportSelectedDefinitionJson(): string | null {
		const definition = get(selectedResult)?.definition ?? null;
		return definition ? serializeMcuDefinitionDocument(definition) : null;
	}

	function importProjectJson(json: string) {
		project.set(replaceProject(parseMcuSelectProjectDocumentJson(json)));
		selectedResultId.set(null);
	}

	function exportProjectJson(): string {
		return serializeMcuSelectProjectDocument(stampMcuSelectProjectDocument(get(project)));
	}

	function selectResult(definitionId: string | null) {
		selectedResultId.set(definitionId);
	}

	function exportPinmuxProjectJsonForResult(definitionId: string): string | null {
		const record = get(catalog).records.find(
			(candidate) => candidate.definition.id === definitionId
		);

		return record ? buildPinmuxProjectJsonFromMcuSelectMatch(record, get(project)) : null;
	}

	function buildPinmuxUrlForResult(definitionId: string, locationHref: string): string | null {
		const record = get(catalog).records.find(
			(candidate) => candidate.definition.id === definitionId
		);

		return record
			? buildPinmuxProjectUrlFromMcuSelectMatch(record, get(project), locationHref)
			: null;
	}

	return {
		catalog,
		groupDefinitions,
		matchSections,
		project,
		projectName,
		selectedResult,
		selectedResultId,
		setProjectName,
		setShowCloseMatches,
		setRequirementMinimum,
		setMinPinCount,
		setMaxPinCount,
		setEthernetPhyMinimum,
		setEthernetMacMinimum,
		setEthernetPhySpeedEnabled,
		setEthernetMacSpeedEnabled,
		setEthernetMacInterfaceEnabled,
		setPackageKindIncluded,
		setPackageKindExcluded,
		clearPackageFilters,
		clearAllFilters,
		toggleFavorite,
		importDefinitionJson,
		exportSelectedDefinitionJson,
		importProjectJson,
		exportProjectJson,
		selectResult,
		exportPinmuxProjectJsonForResult,
		buildPinmuxUrlForResult
	};
}
