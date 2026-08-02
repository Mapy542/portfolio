import { isBuiltInDefinitionId } from '$lib/pinmux/registry';
import {
	createEmptyPinmuxProjectDocument,
	serializePinmuxProjectDocument,
	stampPinmuxProjectDocument,
	type PinmuxProjectDocument
} from '$lib/pinmux/model';
import { buildCompressedProjectUrl, encodeCompressedProjectJson } from '$lib/share/url';

import type { McuSelectCatalogRecord } from './catalog';
import type { McuSelectProjectDocument } from './model';

function compareContributions(
	left: { peripheralLabel: string; peripheralId: string },
	right: { peripheralLabel: string; peripheralId: string }
): number {
	return (
		left.peripheralLabel.localeCompare(right.peripheralLabel, undefined, { numeric: true }) ||
		left.peripheralId.localeCompare(right.peripheralId, undefined, { numeric: true })
	);
}

function collectMatchingEthernetPeripheralIds(
	record: McuSelectCatalogRecord,
	searchProject: McuSelectProjectDocument
) {
	const enabledPeripheralIds = new Set<string>();
	const phyFilter = searchProject.ethernetFilters.phy;
	const macFilter = searchProject.ethernetFilters.mac;

	if (phyFilter.minimumCount > 0) {
		for (const capability of record.ethernet.phy
			.filter(
				(candidate) => phyFilter.speeds.length === 0 || phyFilter.speeds.includes(candidate.speed)
			)
			.slice(0, phyFilter.minimumCount)) {
			enabledPeripheralIds.add(capability.peripheralId);
		}
	}

	if (macFilter.minimumCount > 0) {
		for (const capability of record.ethernet.mac
			.filter((candidate) => {
				const speedMatches =
					macFilter.speeds.length === 0 || macFilter.speeds.includes(candidate.speed);
				const interfaceMatches =
					macFilter.interfaces.length === 0 ||
					candidate.interfaces.some((value) => macFilter.interfaces.includes(value));

				return speedMatches && interfaceMatches;
			})
			.slice(0, macFilter.minimumCount)) {
			enabledPeripheralIds.add(capability.peripheralId);
		}
	}

	return enabledPeripheralIds;
}

export function buildPinmuxProjectFromMcuSelectMatch(
	record: McuSelectCatalogRecord,
	searchProject: McuSelectProjectDocument
): PinmuxProjectDocument {
	const enabledPeripheralIds = new Set<string>();
	for (const peripheralId of collectMatchingEthernetPeripheralIds(record, searchProject)) {
		enabledPeripheralIds.add(peripheralId);
	}

	for (const requirement of searchProject.requirements) {
		if (requirement.minimumCount <= 0) {
			continue;
		}

		const contributions = [...(record.groupContributions[requirement.groupId] ?? [])].sort(
			compareContributions
		);

		for (const contribution of contributions.slice(0, requirement.minimumCount)) {
			enabledPeripheralIds.add(contribution.peripheralId);
		}
	}

	const project = createEmptyPinmuxProjectDocument(record.definition.id);
	project.meta.name = `${searchProject.meta.name} - ${record.definition.name}`;
	project.peripheralStates = record.definition.peripherals
		.filter((peripheral) => enabledPeripheralIds.has(peripheral.id))
		.map((peripheral) => ({
			peripheralId: peripheral.id,
			enabled: true,
			selectedRoutingOptionId: null,
			routingChoiceKind: 'auto' as const
		}));

	if (!isBuiltInDefinitionId(record.definition.id)) {
		project.embeddedDefinition = record.definition;
	}

	return stampPinmuxProjectDocument(project);
}

export function buildPinmuxProjectJsonFromMcuSelectMatch(
	record: McuSelectCatalogRecord,
	searchProject: McuSelectProjectDocument
): string {
	return serializePinmuxProjectDocument(
		buildPinmuxProjectFromMcuSelectMatch(record, searchProject)
	);
}

export function buildPinmuxProjectUrlFromMcuSelectMatch(
	record: McuSelectCatalogRecord,
	searchProject: McuSelectProjectDocument,
	locationHref: string
): string {
	const pinmuxProjectJson = buildPinmuxProjectJsonFromMcuSelectMatch(record, searchProject);
	return buildCompressedProjectUrl(
		encodeCompressedProjectJson(pinmuxProjectJson),
		new URL('/tools/pinmux', locationHref).toString()
	);
}
