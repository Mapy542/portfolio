export const shareToolIds = ['pinmux', 'signal-sim'] as const;

export type ShareToolId = (typeof shareToolIds)[number];

export const TEMPORARY_SHARE_AVAILABILITY_MESSAGE =
	'Functional until website is updated (roughly monthly).';

const shareToolDefinitions = {
	pinmux: {
		displayName: 'Pinmux',
		routePath: '/tools/pinmux',
		shortShareUnavailableReason:
			'Temporary short URLs currently support Pinmux projects that use built-in MCU definitions only.'
	},
	'signal-sim': {
		displayName: 'Signal Sim',
		routePath: '/tools/signal-sim',
		shortShareUnavailableReason: null
	}
} satisfies Record<
	ShareToolId,
	{
		displayName: string;
		routePath: string;
		shortShareUnavailableReason: string | null;
	}
>;

export function isShareToolId(value: string): value is ShareToolId {
	return value in shareToolDefinitions;
}

export function getShareToolDefinition(tool: ShareToolId) {
	return shareToolDefinitions[tool];
}

export function getShortShareUnavailableReason(tool: ShareToolId): string | null {
	return shareToolDefinitions[tool].shortShareUnavailableReason;
}
