import { resolveTemporaryShareLink } from '$lib/share/api';
import { getShareToolDefinition, type ShareToolId } from '$lib/share/tools';
import { getEncodedProjectFromUrl, getShortShareIdFromUrl } from '$lib/share/url';

export interface ResolvedSharedProject {
	source: 'long' | 'short';
	projectJson: string;
}

export interface ResolveSharedProjectOptions {
	currentUrl: URL;
	tool: ShareToolId;
	decodeLongShare: (encodedProject: string) => string;
	wrongToolMessage?: (actualTool: ShareToolId) => string;
}

export async function resolveSharedProjectFromUrl(
	options: ResolveSharedProjectOptions
): Promise<ResolvedSharedProject | null> {
	const shortShareId = getShortShareIdFromUrl(options.currentUrl);

	if (shortShareId) {
		const temporaryShare = await resolveTemporaryShareLink(shortShareId);

		if (temporaryShare.tool !== options.tool) {
			throw new Error(
				options.wrongToolMessage?.(temporaryShare.tool) ??
					`This shared URL belongs to ${getShareToolDefinition(temporaryShare.tool).displayName}.`
			);
		}

		return {
			source: 'short',
			projectJson: temporaryShare.projectJson
		};
	}

	const encodedProject = getEncodedProjectFromUrl(options.currentUrl);

	if (!encodedProject) {
		return null;
	}

	return {
		source: 'long',
		projectJson: options.decodeLongShare(encodedProject)
	};
}
