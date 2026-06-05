import { isBuiltInDefinitionId } from '$lib/pinmux/built-in-definition-ids';
import { parsePinmuxProjectDocumentJson, serializePinmuxProjectDocument } from '$lib/pinmux/model';
import { parseProjectDocumentJson, serializeProjectDocument } from '$lib/signal-sim/model';
import { getShortShareUnavailableReason, type ShareToolId } from '$lib/share/tools';

export interface ValidatedSharedProject {
	normalizedProjectJson: string;
	shortShareEligible: boolean;
}

export function validateSharedProjectJson(
	tool: ShareToolId,
	projectJson: string
): ValidatedSharedProject {
	switch (tool) {
		case 'pinmux': {
			const project = parsePinmuxProjectDocumentJson(projectJson);
			return {
				normalizedProjectJson: serializePinmuxProjectDocument(project),
				shortShareEligible:
					project.embeddedDefinition === null && isBuiltInDefinitionId(project.selectedDefinitionId)
			};
		}
		case 'signal-sim': {
			const project = parseProjectDocumentJson(projectJson);
			return {
				normalizedProjectJson: serializeProjectDocument(project),
				shortShareEligible: true
			};
		}
	}
}

export function isShortShareEligibleProjectJson(tool: ShareToolId, projectJson: string): boolean {
	return validateSharedProjectJson(tool, projectJson).shortShareEligible;
}

export function getRequiredShortShareUnavailableReason(tool: ShareToolId): string {
	return (
		getShortShareUnavailableReason(tool) ?? 'Temporary short URLs are not available for this tool.'
	);
}
