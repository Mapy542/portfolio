import type { McuDefinitionDocument, PeripheralInstance } from '$lib/pinmux/model';

import type { McuSelectEthernetMacInterface, McuSelectEthernetSpeed } from './model';

export type McuSelectGroupCategory =
	| 'connectivity'
	| 'serial'
	| 'bus'
	| 'memory'
	| 'timer'
	| 'analog'
	| 'audio'
	| 'display'
	| 'motor'
	| 'other';

export interface McuSelectGroupDefinition {
	id: string;
	label: string;
	category: McuSelectGroupCategory;
	description: string;
	sortOrder: number;
}

export interface McuSelectGroupContribution {
	peripheralId: string;
	peripheralLabel: string;
	peripheralFamily: string;
	signalIds: string[];
	notes: string[];
}

export interface McuSelectCatalogRecord {
	definition: McuDefinitionDocument;
	pinCount: number;
	packageKind: McuDefinitionDocument['package']['kind'];
	groupCounts: Record<string, number>;
	groupContributions: Record<string, McuSelectGroupContribution[]>;
	ethernet: {
		phy: McuSelectEthernetPhyCapability[];
		mac: McuSelectEthernetMacCapability[];
	};
}

export interface McuSelectCatalog {
	groups: McuSelectGroupDefinition[];
	records: McuSelectCatalogRecord[];
}

interface DerivedGroup {
	definition: McuSelectGroupDefinition;
	contribution: McuSelectGroupContribution;
}

export interface McuSelectEthernetPhyCapability {
	peripheralId: string;
	peripheralLabel: string;
	speed: McuSelectEthernetSpeed;
	notes: string[];
}

export interface McuSelectEthernetMacCapability {
	peripheralId: string;
	peripheralLabel: string;
	speed: McuSelectEthernetSpeed;
	interfaces: McuSelectEthernetMacInterface[];
	notes: string[];
}

const categorySortOrder: Record<McuSelectGroupCategory, number> = {
	connectivity: 10,
	serial: 20,
	bus: 30,
	memory: 40,
	timer: 50,
	analog: 60,
	audio: 70,
	display: 80,
	motor: 90,
	other: 100
};

function createGroupDefinition(
	id: string,
	label: string,
	category: McuSelectGroupCategory,
	description: string,
	sortOffset = 0
): McuSelectGroupDefinition {
	return {
		id,
		label,
		category,
		description,
		sortOrder: categorySortOrder[category] * 100 + sortOffset
	};
}

function slugifyToken(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function uniqueStrings(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueNotes(values: Iterable<string>): string[] {
	return [...new Set(values)].filter(Boolean);
}

function getSignalIds(peripheral: PeripheralInstance): string[] {
	return peripheral.signals.map((signal) => signal.id);
}

function hasSignalId(peripheral: PeripheralInstance, signalId: string): boolean {
	return peripheral.signals.some((signal) => signal.id.toUpperCase() === signalId);
}

function hasAllSignalIds(peripheral: PeripheralInstance, signalIds: string[]): boolean {
	return signalIds.every((signalId) => hasSignalId(peripheral, signalId));
}

function buildBaseContribution(
	peripheral: PeripheralInstance,
	notes: Iterable<string> = []
): McuSelectGroupContribution {
	return {
		peripheralId: peripheral.id,
		peripheralLabel: peripheral.label,
		peripheralFamily: peripheral.family,
		signalIds: uniqueStrings(getSignalIds(peripheral)),
		notes: uniqueNotes(notes)
	};
}

function deriveTimerGroups(peripheral: PeripheralInstance): DerivedGroup[] {
	const upperDescription = peripheral.description.toUpperCase();
	const notes: string[] = [];
	const hasComplementaryOutputs = ['CH1N', 'CH2N', 'CH3N', 'CH4N'].some((signalId) =>
		hasSignalId(peripheral, signalId)
	);
	const hasBreakInput = ['BKIN', 'BKIN2', 'BRK'].some((signalId) =>
		hasSignalId(peripheral, signalId)
	);
	const looksAdvanced =
		hasComplementaryOutputs ||
		hasBreakInput ||
		upperDescription.includes('ADVANCED-CONTROL') ||
		upperDescription.includes('MOTOR-CONTROL');

	if (hasComplementaryOutputs) {
		notes.push('Complementary outputs detected');
	}

	if (hasBreakInput) {
		notes.push('Break or fault input detected');
	}

	return [
		{
			definition: looksAdvanced
				? createGroupDefinition(
						'advanced-motion-timer',
						'Advanced / Motion Timer',
						'timer',
						'Advanced timer peripherals with complementary outputs, break/fault inputs, and motor-control features for precision PWM and motion control.',
						10
					)
				: createGroupDefinition(
						'general-timer',
						'General Timer',
						'timer',
						'General-purpose timers for basic PWM, capture, and event timing without dedicated motor-control features.',
						20
					),
			contribution: buildBaseContribution(peripheral, notes)
		}
	];
}

function classifyEthernetSpeed(
	description: string,
	signalIds: string[]
): McuSelectEthernetSpeed | null {
	const haystack = `${description} ${signalIds.join(' ')}`.toUpperCase();

	if (/\b10M\b|10M ETHERNET|10BASE/.test(haystack)) {
		return '10m';
	}

	if (/10\/100|100M|FAST ETHERNET|MII|RMII/.test(haystack)) {
		return '10-100';
	}

	if (/\b1G\b|1000|GIGABIT/.test(haystack)) {
		return '1g';
	}

	if (/RGMII|SGMII/.test(haystack)) {
		return '1g';
	}

	if (/MII|RMII/.test(haystack)) {
		return '10-100';
	}

	return null;
}

function deriveEthernetCapabilities(
	peripheral: PeripheralInstance,
	definition: McuDefinitionDocument
): {
	phy: McuSelectEthernetPhyCapability[];
	mac: McuSelectEthernetMacCapability[];
} {
	const signalIds = getSignalIds(peripheral).map((signalId) => signalId.toUpperCase());
	const upperDescription = `${definition.description} ${peripheral.description}`.toUpperCase();
	const hasMii = signalIds.some((signalId) => signalId.startsWith('MII_'));
	const hasRmii = signalIds.some((signalId) => signalId.startsWith('RMII_'));
	const hasRgmii = signalIds.some((signalId) => signalId.startsWith('RGMII_'));
	const hasSgmii = signalIds.some((signalId) => signalId.startsWith('SGMII_'));
	const hasDedicatedPhySignal = hasSignalId(peripheral, 'PHY');
	const hasDifferentialPairs = hasAllSignalIds(peripheral, ['TXP', 'TXN', 'RXP', 'RXN']);
	const hasMdiLaneSignals = hasAllSignalIds(peripheral, ['MDITP', 'MDITN', 'MDIRP', 'MDIRN']);
	const hasMdiSignals = hasDedicatedPhySignal || hasDifferentialPairs || hasMdiLaneSignals;
	const speed = classifyEthernetSpeed(upperDescription, signalIds) ?? '10-100';
	const notes = uniqueNotes([
		hasDedicatedPhySignal ? 'Dedicated PHY signal detected' : '',
		hasDifferentialPairs ? 'Differential TX/RX pairs detected' : '',
		hasMdiLaneSignals ? 'MDI lane signals detected' : '',
		hasMii ? 'MII signals present' : '',
		hasRmii ? 'RMII signals present' : '',
		hasRgmii ? 'RGMII signals present' : '',
		hasSgmii ? 'SGMII signals present' : ''
	]);
	const macInterfaces = uniqueStrings(
		[
			hasMii ? 'mii' : '',
			hasRmii ? 'rmii' : '',
			hasRgmii ? 'rgmii' : '',
			hasSgmii ? 'sgmii' : ''
		].filter(Boolean)
	) as McuSelectEthernetMacInterface[];

	return {
		phy: hasMdiSignals
			? [
					{
						peripheralId: peripheral.id,
						peripheralLabel: peripheral.label,
						speed,
						notes
					}
				]
			: [],
		mac:
			macInterfaces.length > 0
				? [
						{
							peripheralId: peripheral.id,
							peripheralLabel: peripheral.label,
							speed,
							interfaces: macInterfaces,
							notes
						}
					]
				: []
	};
}

function deriveUsbGroups(
	peripheral: PeripheralInstance,
	definition: McuDefinitionDocument
): DerivedGroup[] {
	const upperHaystack =
		`${definition.description} ${peripheral.label} ${peripheral.description}`.toUpperCase();
	const groups: DerivedGroup[] = [];
	const contribution = buildBaseContribution(peripheral);

	if (/HIGH-SPEED|OTG_HS|USBHS|ULPI/.test(upperHaystack)) {
		groups.push({
			definition: createGroupDefinition(
				'usb-high-speed',
				'USB High-Speed',
				'connectivity',
				'USB High-Speed peripherals for 480 Mb/s connectivity and OTG HS support in device or host mode.',
				50
			),
			contribution
		});
	}

	if (groups.length === 0 || /FULL-SPEED|OTG_FS|USBFS|USB FULL-SPEED/.test(upperHaystack)) {
		groups.push({
			definition: createGroupDefinition(
				'usb-full-speed',
				'USB Full-Speed',
				'connectivity',
				'USB Full-Speed peripherals for 12 Mb/s connectivity and OTG FS support in device or host mode.',
				51
			),
			contribution
		});
	}

	return groups;
}

function toTitleCase(value: string): string {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function deriveFallbackGroup(peripheral: PeripheralInstance): DerivedGroup {
	const normalizedFamily =
		slugifyToken(peripheral.family) || slugifyToken(peripheral.label) || 'other';

	return {
		definition: createGroupDefinition(
			`family-${normalizedFamily}`,
			toTitleCase(peripheral.family) || toTitleCase(peripheral.label),
			'other',
			`${peripheral.family} peripheral instances normalized directly from the MCU catalog.`,
			90
		),
		contribution: buildBaseContribution(peripheral)
	};
}

function deriveKnownGroups(
	peripheral: PeripheralInstance,
	definition: McuDefinitionDocument
): DerivedGroup[] {
	const upperFamily = peripheral.family.toUpperCase();
	const upperLabel = peripheral.label.toUpperCase();

	if (upperFamily === 'ETH') {
		return [];
	}

	if (upperFamily === 'USB' || upperFamily === 'OTG') {
		return deriveUsbGroups(peripheral, definition);
	}

	if (upperFamily === 'TIM' || upperFamily === 'TIMER') {
		return deriveTimerGroups(peripheral);
	}

	if (upperFamily === 'LPTIM') {
		return [
			{
				definition: createGroupDefinition(
					'low-power-timer',
					'Low-Power Timer',
					'timer',
					'Low-power timer peripherals designed for energy-efficient periodic wakeups, input capture, and low-bandwidth timing.',
					30
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'HRTIM') {
		return [
			{
				definition: createGroupDefinition(
					'high-resolution-timer',
					'High-Resolution Timer',
					'timer',
					'High-resolution timer peripherals for precise PWM generation, deadtime control, and fine-grained waveform timing.',
					40
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'CAN') {
		return [
			{
				definition: createGroupDefinition(
					'can',
					'CAN / FDCAN',
					'connectivity',
					'CAN / FDCAN bus peripherals for robust multi-node messaging in automotive and industrial control systems.',
					60
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'UART') {
		return [
			{
				definition: upperLabel.startsWith('LPUART')
					? createGroupDefinition(
							'lpuart',
							'LPUART',
							'serial',
							'Low-power UART serial interfaces optimized for energy-efficient telemetry and debug communication.',
							10
						)
					: createGroupDefinition(
							'uart',
							'UART',
							'serial',
							'UART serial interfaces with TX/RX data lanes and optional control signals, common for low-bandwidth serial communication and debugging.',
							20
						),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'USART') {
		return [
			{
				definition: createGroupDefinition(
					'usart',
					'USART',
					'serial',
					'USART serial interfaces supporting asynchronous UART communication and optional synchronous modes for flexible peripheral data transfer.',
					30
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (
		upperFamily === 'SPI' ||
		upperFamily === 'QSPI' ||
		upperFamily === 'QUADSPI' ||
		upperFamily === 'OCTOSPI' ||
		upperFamily === 'OCTOSPIM'
	) {
		const isQspi =
			upperFamily === 'QSPI' ||
			upperFamily === 'QUADSPI' ||
			upperFamily === 'OCTOSPI' ||
			upperFamily === 'OCTOSPIM' ||
			upperLabel.includes('QSPI') ||
			upperLabel.includes('QUADSPI') ||
			upperLabel.includes('OCTOSPI') ||
			upperLabel.includes('OCTOSPIM') ||
			peripheral.description.toUpperCase().includes('QUAD');

		return [
			{
				definition: isQspi
					? createGroupDefinition(
							'qspi',
							'QSPI / OctoSPI',
							'bus',
							'Quad-SPI and OctoSPI serial memory interfaces for high-speed flash access and external memory communication.',
							10
						)
					: createGroupDefinition(
							'spi',
							'SPI',
							'bus',
							'SPI serial bus peripherals for MOSI/MISO/SCLK data exchange and optional chip-select control.',
							20
						),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'I2C') {
		return [
			{
				definition: createGroupDefinition(
					'i2c',
					'I2C',
					'bus',
					'I2C bus peripherals for two-wire, multi-drop serial communication with addressing and clock-stretching support.',
					30
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'I3C') {
		return [
			{
				definition: createGroupDefinition(
					'i3c',
					'I3C',
					'bus',
					'I3C bus peripherals for higher-speed two-wire sensor and device communication with in-band interrupt support.',
					40
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'I2S') {
		return [
			{
				definition: createGroupDefinition(
					'i2s',
					'I2S',
					'audio',
					'I2S audio peripherals for digital audio streaming with serial data, clock, and word-select signals.',
					10
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'SAI') {
		return [
			{
				definition: createGroupDefinition(
					'sai',
					'SAI',
					'audio',
					'SAI audio peripherals for multi-channel digital audio streaming with configurable frame sync and serial lanes.',
					20
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'FMC' || upperFamily === 'FSMC') {
		return [
			{
				definition: createGroupDefinition(
					'fmc-fsmc',
					'FMC / FSMC',
					'memory',
					'External memory controllers for parallel SDRAM, SRAM, and flash interfaces with wide address and data buses.',
					10
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'SDIO' || upperFamily === 'SDMMC') {
		return [
			{
				definition: createGroupDefinition(
					'sdio-sdmmc',
					'SDIO / SDMMC',
					'bus',
					'SDIO / SDMMC host controllers for SD card and multimedia storage interfaces with command, data, and clock lanes.',
					50
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'ADC') {
		return [
			{
				definition: createGroupDefinition(
					'adc',
					'ADC',
					'analog',
					'ADC peripherals that sample analog voltages and convert them to digital values for sensing and signal monitoring.',
					10
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'DAC') {
		return [
			{
				definition: createGroupDefinition(
					'dac',
					'DAC',
					'analog',
					'DAC peripherals that generate analog output voltages from digital values for audio or control signals.',
					20
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'OPA') {
		return [
			{
				definition: createGroupDefinition(
					'op-amp',
					'Op-Amp',
					'analog',
					'On-chip op-amp peripherals for signal conditioning, buffering, and analog feedback loops.',
					30
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'CMP') {
		return [
			{
				definition: createGroupDefinition(
					'comparator',
					'Comparator',
					'analog',
					'Analog comparator peripherals for threshold detection, window monitoring, and fast voltage comparison.',
					40
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'DVP') {
		return [
			{
				definition: createGroupDefinition(
					'dvp',
					'DVP',
					'display',
					'Digital video port peripherals for parallel camera/video input with pixel, sync, and frame timing signals.',
					10
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'LTDC') {
		return [
			{
				definition: createGroupDefinition(
					'ltdc',
					'LTDC',
					'display',
					'LTDC display controllers for driving TFT LCD panels with pixel, sync, and timing generation.',
					20
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	if (upperFamily === 'USBPD' || upperFamily === 'UCPD') {
		return [
			{
				definition: createGroupDefinition(
					'usb-pd',
					'USB Power Delivery',
					'connectivity',
					'USB Power Delivery peripherals for Type-C negotiation, power-role control, and charger/data management.',
					70
				),
				contribution: buildBaseContribution(peripheral)
			}
		];
	}

	return [deriveFallbackGroup(peripheral)];
}

export function buildMcuSelectCatalog(definitions: McuDefinitionDocument[]): McuSelectCatalog {
	const groupDefinitions = new Map<string, McuSelectGroupDefinition>();
	const records: McuSelectCatalogRecord[] = definitions.map((definition) => {
		const groupCounts = new Map<string, number>();
		const groupContributions = new Map<string, McuSelectGroupContribution[]>();
		const ethernetPhyCapabilities: McuSelectEthernetPhyCapability[] = [];
		const ethernetMacCapabilities: McuSelectEthernetMacCapability[] = [];

		for (const peripheral of definition.peripherals) {
			if (peripheral.family.toUpperCase() === 'ETH') {
				const ethernetCapabilities = deriveEthernetCapabilities(peripheral, definition);
				ethernetPhyCapabilities.push(...ethernetCapabilities.phy);
				ethernetMacCapabilities.push(...ethernetCapabilities.mac);
			}

			const groups = deriveKnownGroups(peripheral, definition);
			const seenGroupIds = new Set<string>();

			for (const group of groups) {
				if (seenGroupIds.has(group.definition.id)) {
					continue;
				}

				seenGroupIds.add(group.definition.id);
				groupDefinitions.set(group.definition.id, group.definition);
				groupCounts.set(group.definition.id, (groupCounts.get(group.definition.id) ?? 0) + 1);
				groupContributions.set(group.definition.id, [
					...(groupContributions.get(group.definition.id) ?? []),
					group.contribution
				]);
			}
		}

		return {
			definition,
			pinCount: definition.package.pinCount,
			packageKind: definition.package.kind,
			groupCounts: Object.fromEntries(groupCounts),
			groupContributions: Object.fromEntries(groupContributions),
			ethernet: {
				phy: ethernetPhyCapabilities.sort(
					(left, right) =>
						left.peripheralLabel.localeCompare(right.peripheralLabel, undefined, {
							numeric: true
						}) || left.peripheralId.localeCompare(right.peripheralId, undefined, { numeric: true })
				),
				mac: ethernetMacCapabilities.sort(
					(left, right) =>
						left.peripheralLabel.localeCompare(right.peripheralLabel, undefined, {
							numeric: true
						}) || left.peripheralId.localeCompare(right.peripheralId, undefined, { numeric: true })
				)
			}
		};
	});

	const groups = [...groupDefinitions.values()].sort(
		(left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)
	);

	return {
		groups,
		records
	};
}
