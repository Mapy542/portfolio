import { json } from '@sveltejs/kit';

import { validateSharedProjectJson } from '$lib/share/project-registry';
import {
	getShareToolDefinition,
	isShareToolId,
	TEMPORARY_SHARE_AVAILABILITY_MESSAGE
} from '$lib/share/tools';
import { buildTemporaryShareUrl } from '$lib/share/url';
import {
	createTemporaryProjectShare,
	getTemporaryProjectShare
} from '$lib/server/project-short-links';

export async function GET({ url }: { url: URL }) {
	const id = url.searchParams.get('id')?.trim() ?? '';

	if (!id) {
		return json({ error: 'A short link id is required.' }, { status: 400 });
	}

	const share = getTemporaryProjectShare(id);

	if (!share) {
		return json(
			{
				error: `This temporary share link is no longer available. ${TEMPORARY_SHARE_AVAILABILITY_MESSAGE}`
			},
			{ status: 404 }
		);
	}

	return json({
		id: share.id,
		tool: share.tool,
		projectJson: share.projectJson,
		createdAt: share.createdAt,
		temporary: true
	});
}

export async function POST({ request, url }: { request: Request; url: URL }) {
	let body: { tool?: unknown; projectJson?: unknown };

	try {
		body = await request.json();
	} catch {
		return json({ error: 'The share payload must be valid JSON.' }, { status: 400 });
	}

	if (typeof body.tool !== 'string' || !isShareToolId(body.tool)) {
		return json({ error: 'A supported share tool id is required.' }, { status: 400 });
	}

	if (typeof body.projectJson !== 'string' || body.projectJson.trim().length === 0) {
		return json({ error: 'A serialized project is required.' }, { status: 400 });
	}

	try {
		const validatedProject = validateSharedProjectJson(body.tool, body.projectJson);
		const shortShareUnavailableReason = getShareToolDefinition(
			body.tool
		).shortShareUnavailableReason;

		if (!validatedProject.shortShareEligible) {
			return json(
				{
					error:
						shortShareUnavailableReason ?? 'Temporary short URLs are not available for this tool.'
				},
				{ status: 400 }
			);
		}

		const temporaryShare = createTemporaryProjectShare(
			body.tool,
			validatedProject.normalizedProjectJson
		);

		return json({
			id: temporaryShare.id,
			tool: temporaryShare.tool,
			url: buildTemporaryShareUrl(
				temporaryShare.id,
				url.origin,
				getShareToolDefinition(temporaryShare.tool).routePath
			),
			createdAt: temporaryShare.createdAt,
			temporary: true
		});
	} catch (error) {
		return json(
			{
				error: error instanceof Error ? error.message : 'The share payload could not be validated.'
			},
			{ status: 400 }
		);
	}
}
