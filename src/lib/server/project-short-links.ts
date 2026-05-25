import { randomBytes } from 'node:crypto';

import type { ShareToolId } from '$lib/share/tools';

export interface TemporaryProjectShareEntry {
	id: string;
	tool: ShareToolId;
	projectJson: string;
	createdAt: string;
}

const MAX_SHORT_LINKS = 250;
const MAX_GENERATION_ATTEMPTS = 8;

const temporaryProjectShares = new Map<string, TemporaryProjectShareEntry>();

function evictOldestTemporaryProjectShare() {
	const oldestShareId = temporaryProjectShares.keys().next().value;

	if (!oldestShareId) {
		return;
	}

	temporaryProjectShares.delete(oldestShareId);
}

export function createTemporaryProjectShare(
	tool: ShareToolId,
	projectJson: string
): TemporaryProjectShareEntry {
	while (temporaryProjectShares.size >= MAX_SHORT_LINKS) {
		evictOldestTemporaryProjectShare();
	}

	for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
		const id = randomBytes(5).toString('base64url');

		if (temporaryProjectShares.has(id)) {
			continue;
		}

		const entry = {
			id,
			tool,
			projectJson,
			createdAt: new Date().toISOString()
		};

		temporaryProjectShares.set(id, entry);
		return entry;
	}

	throw new Error('Unable to generate a unique temporary share URL for this project.');
}

export function getTemporaryProjectShare(id: string): TemporaryProjectShareEntry | null {
	return temporaryProjectShares.get(id) ?? null;
}
