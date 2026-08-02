import type { McuSelectCatalog, McuSelectCatalogRecord, McuSelectGroupDefinition } from './catalog';
import {
	normalizeMcuSelectRequirements,
	type McuSelectEthernetMacFilter,
	type McuSelectEthernetPhyFilter,
	type McuSelectProjectDocument,
	type McuSelectRequirement
} from './model';

export interface McuSelectRequirementOutcome {
	groupId: string;
	groupLabel: string;
	requiredCount: number;
	availableCount: number;
	shortage: number;
	surplus: number;
}

export interface McuSelectMatchRow {
	record: McuSelectCatalogRecord;
	totalShortage: number;
	totalSurplus: number;
	criteriaOutcomes: McuSelectRequirementOutcome[];
}

export interface McuSelectMatchSections {
	exact: McuSelectMatchRow[];
	missing1: McuSelectMatchRow[];
	missing2: McuSelectMatchRow[];
	activeRequirements: McuSelectRequirement[];
	activeEthernetFilters: {
		phy: McuSelectEthernetPhyFilter | null;
		mac: McuSelectEthernetMacFilter | null;
	};
	hardFilteredCount: number;
}

function buildGroupMap(catalog: McuSelectCatalog): Map<string, McuSelectGroupDefinition> {
	return new Map(catalog.groups.map((group) => [group.id, group]));
}

function passesPackageFilters(
	record: McuSelectCatalogRecord,
	project: McuSelectProjectDocument
): boolean {
	const { minPinCount, maxPinCount, includePackageKinds, excludePackageKinds } =
		project.packageFilters;

	if (minPinCount !== null && record.pinCount < minPinCount) {
		return false;
	}

	if (maxPinCount !== null && record.pinCount > maxPinCount) {
		return false;
	}

	if (includePackageKinds.length > 0 && !includePackageKinds.includes(record.packageKind)) {
		return false;
	}

	if (excludePackageKinds.includes(record.packageKind)) {
		return false;
	}

	return true;
}

function compareRows(left: McuSelectMatchRow, right: McuSelectMatchRow): number {
	return (
		left.totalShortage - right.totalShortage ||
		left.totalSurplus - right.totalSurplus ||
		left.record.pinCount - right.record.pinCount ||
		`${left.record.definition.vendor} ${left.record.definition.name}`.localeCompare(
			`${right.record.definition.vendor} ${right.record.definition.name}`,
			undefined,
			{ numeric: true }
		)
	);
}

function getActiveEthernetPhyFilter(
	project: McuSelectProjectDocument
): McuSelectEthernetPhyFilter | null {
	return project.ethernetFilters.phy.minimumCount > 0 ? project.ethernetFilters.phy : null;
}

function getActiveEthernetMacFilter(
	project: McuSelectProjectDocument
): McuSelectEthernetMacFilter | null {
	return project.ethernetFilters.mac.minimumCount > 0 ? project.ethernetFilters.mac : null;
}

function buildEthernetPhyOutcome(
	record: McuSelectCatalogRecord,
	filter: McuSelectEthernetPhyFilter
): McuSelectRequirementOutcome {
	const matchingCapabilities = record.ethernet.phy.filter(
		(capability) => filter.speeds.length === 0 || filter.speeds.includes(capability.speed)
	);
	const availableCount = matchingCapabilities.length;
	const shortage = Math.max(0, filter.minimumCount - availableCount);
	const surplus = Math.max(0, availableCount - filter.minimumCount);
	const speedLabel =
		filter.speeds.length === 0
			? 'Any Speed'
			: filter.speeds.map((speed) => speed.toUpperCase()).join(' / ');

	return {
		groupId: 'ethernet-phy',
		groupLabel: `ETH PHY ${speedLabel}`,
		requiredCount: filter.minimumCount,
		availableCount,
		shortage,
		surplus
	};
}

function buildEthernetMacOutcome(
	record: McuSelectCatalogRecord,
	filter: McuSelectEthernetMacFilter
): McuSelectRequirementOutcome {
	const matchingCapabilities = record.ethernet.mac.filter((capability) => {
		const speedMatches = filter.speeds.length === 0 || filter.speeds.includes(capability.speed);
		const interfaceMatches =
			filter.interfaces.length === 0 ||
			capability.interfaces.some((candidate) => filter.interfaces.includes(candidate));

		return speedMatches && interfaceMatches;
	});
	const availableCount = matchingCapabilities.length;
	const shortage = Math.max(0, filter.minimumCount - availableCount);
	const surplus = Math.max(0, availableCount - filter.minimumCount);
	const speedLabel =
		filter.speeds.length === 0
			? 'Any Speed'
			: filter.speeds.map((speed) => speed.toUpperCase()).join(' / ');
	const interfaceLabel =
		filter.interfaces.length === 0
			? 'Any Interface'
			: filter.interfaces.map((value) => value.toUpperCase()).join(' / ');

	return {
		groupId: 'ethernet-mac',
		groupLabel: `ETH MAC ${interfaceLabel} ${speedLabel}`,
		requiredCount: filter.minimumCount,
		availableCount,
		shortage,
		surplus
	};
}

function buildMatchRow(
	record: McuSelectCatalogRecord,
	requirements: McuSelectRequirement[],
	groupMap: Map<string, McuSelectGroupDefinition>,
	activeEthernetFilters: McuSelectMatchSections['activeEthernetFilters']
): McuSelectMatchRow {
	const criteriaOutcomes = requirements.map((requirement) => {
		const availableCount = record.groupCounts[requirement.groupId] ?? 0;
		const shortage = Math.max(0, requirement.minimumCount - availableCount);
		const surplus = Math.max(0, availableCount - requirement.minimumCount);

		return {
			groupId: requirement.groupId,
			groupLabel: groupMap.get(requirement.groupId)?.label ?? requirement.groupId,
			requiredCount: requirement.minimumCount,
			availableCount,
			shortage,
			surplus
		};
	});

	if (activeEthernetFilters.phy) {
		criteriaOutcomes.push(buildEthernetPhyOutcome(record, activeEthernetFilters.phy));
	}

	if (activeEthernetFilters.mac) {
		criteriaOutcomes.push(buildEthernetMacOutcome(record, activeEthernetFilters.mac));
	}

	return {
		record,
		totalShortage: criteriaOutcomes.reduce((total, outcome) => total + outcome.shortage, 0),
		totalSurplus: criteriaOutcomes.reduce((total, outcome) => total + outcome.surplus, 0),
		criteriaOutcomes
	};
}

export function buildMcuSelectMatchSections(
	catalog: McuSelectCatalog,
	project: McuSelectProjectDocument
): McuSelectMatchSections {
	const groupMap = buildGroupMap(catalog);
	const activeRequirements = normalizeMcuSelectRequirements(project.requirements).filter(
		(requirement) => requirement.minimumCount > 0
	);
	const activeEthernetFilters = {
		phy: getActiveEthernetPhyFilter(project),
		mac: getActiveEthernetMacFilter(project)
	};
	const exact: McuSelectMatchRow[] = [];
	const missing1: McuSelectMatchRow[] = [];
	const missing2: McuSelectMatchRow[] = [];
	let hardFilteredCount = 0;

	for (const record of catalog.records) {
		if (!passesPackageFilters(record, project)) {
			hardFilteredCount += 1;
			continue;
		}

		const row = buildMatchRow(record, activeRequirements, groupMap, activeEthernetFilters);

		if (row.totalShortage === 0) {
			exact.push(row);
			continue;
		}

		if (!project.showCloseMatches) {
			continue;
		}

		if (row.totalShortage === 1) {
			missing1.push(row);
			continue;
		}

		if (row.totalShortage === 2) {
			missing2.push(row);
		}
	}

	exact.sort(compareRows);
	missing1.sort(compareRows);
	missing2.sort(compareRows);

	return {
		exact,
		missing1,
		missing2,
		activeRequirements,
		activeEthernetFilters,
		hardFilteredCount
	};
}
