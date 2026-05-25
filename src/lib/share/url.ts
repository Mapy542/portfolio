import lzString from 'lz-string';

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;

export const SHARE_HASH_PARAM = 'project';
export const SHARE_QUERY_PARAM = 'share';
export const COMPRESSED_SHARE_PREFIX = 'lz:';
export const SHARE_URL_WARNING_LENGTH = 12000;

export interface DecodeCompressedShareOptions {
	fallbackDecoder?: (value: string) => string;
	unsupportedFormatMessage?: string;
	invalidShareMessage?: string;
}

export function encodeCompressedProjectJson(value: string): string {
	return `${COMPRESSED_SHARE_PREFIX}${compressToEncodedURIComponent(value)}`;
}

export function decodeCompressedProjectJson(
	value: string,
	options: DecodeCompressedShareOptions = {}
): string {
	if (value.startsWith(COMPRESSED_SHARE_PREFIX)) {
		const decoded = decompressFromEncodedURIComponent(value.slice(COMPRESSED_SHARE_PREFIX.length));

		if (decoded === null) {
			throw new Error(
				options.invalidShareMessage ?? 'The shared project URL is invalid or truncated.'
			);
		}

		return decoded;
	}

	if (options.fallbackDecoder) {
		return options.fallbackDecoder(value);
	}

	throw new Error(options.unsupportedFormatMessage ?? 'This share URL uses an unsupported format.');
}

export function getEncodedProjectFromUrl(url: URL): string | null {
	const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
	return hashParams.get(SHARE_HASH_PARAM);
}

export function getShortShareIdFromUrl(url: URL): string | null {
	return url.searchParams.get(SHARE_QUERY_PARAM);
}

export function buildCompressedProjectUrl(encodedProject: string, locationHref: string): string {
	const shareUrl = new URL(locationHref);
	const hashParams = new URLSearchParams(shareUrl.hash.replace(/^#/, ''));

	shareUrl.searchParams.delete(SHARE_QUERY_PARAM);
	hashParams.set(SHARE_HASH_PARAM, encodedProject);
	shareUrl.hash = hashParams.toString();

	return shareUrl.toString();
}

export function buildTemporaryShareUrl(
	shareId: string,
	locationHref: string,
	routePath: string
): string {
	const shareUrl = new URL(locationHref);
	shareUrl.pathname = routePath;
	shareUrl.search = new URLSearchParams([[SHARE_QUERY_PARAM, shareId]]).toString();
	shareUrl.hash = '';

	return shareUrl.toString();
}

export function isShareUrlLarge(value: string): boolean {
	return value.length > SHARE_URL_WARNING_LENGTH;
}
