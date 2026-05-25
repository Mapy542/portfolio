import type { ShareToolId } from '$lib/share/tools';

export interface TemporaryShareRecord {
	id: string;
	tool: ShareToolId;
	projectJson: string;
	createdAt: string;
	temporary: true;
}

export interface TemporaryShareLink extends Omit<TemporaryShareRecord, 'projectJson'> {
	url: string;
}

export function getShareApiError(payload: unknown, fallback: string): string {
	if (
		payload &&
		typeof payload === 'object' &&
		'error' in payload &&
		typeof payload.error === 'string'
	) {
		return payload.error;
	}

	return fallback;
}

export async function createTemporaryShareLink(
	tool: ShareToolId,
	projectJson: string
): Promise<TemporaryShareLink> {
	const response = await fetch('/api/share', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ tool, projectJson })
	});
	const payload = await response.json().catch(() => null);

	if (
		!response.ok ||
		!payload ||
		typeof payload !== 'object' ||
		typeof payload.url !== 'string' ||
		typeof payload.id !== 'string' ||
		typeof payload.tool !== 'string' ||
		typeof payload.createdAt !== 'string'
	) {
		throw new Error(getShareApiError(payload, 'Unable to create a temporary share URL.'));
	}

	return payload as TemporaryShareLink;
}

export async function resolveTemporaryShareLink(id: string): Promise<TemporaryShareRecord> {
	const response = await fetch(`/api/share?id=${encodeURIComponent(id)}`);
	const payload = await response.json().catch(() => null);

	if (
		!response.ok ||
		!payload ||
		typeof payload !== 'object' ||
		typeof payload.projectJson !== 'string' ||
		typeof payload.id !== 'string' ||
		typeof payload.tool !== 'string' ||
		typeof payload.createdAt !== 'string'
	) {
		throw new Error(getShareApiError(payload, 'Unable to load the shared project.'));
	}

	return payload as TemporaryShareRecord;
}
