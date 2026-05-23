/// <reference lib="webworker" />

import { analyzePinmuxProject } from '$lib/pinmux/solver';
import type { PinmuxSolveRequest, PinmuxSolveResponse } from '$lib/pinmux/worker-types';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<PinmuxSolveRequest>) => {
	const { requestId, definition, project } = event.data;

	if (!definition) {
		const response: PinmuxSolveResponse = {
			requestId,
			ok: false,
			diagnostics: [
				{
					id: 'missing-definition',
					level: 'error',
					message: 'No MCU definition is selected.'
				}
			],
			message: 'No MCU definition is selected.',
			solution: {
				assignments: [],
				pinStates: [],
				peripheralStates: []
			}
		};

		workerScope.postMessage(response);
		return;
	}

	try {
		const analysis = analyzePinmuxProject(definition, project);
		const response: PinmuxSolveResponse = analysis.ok
			? {
					requestId,
					ok: true,
					diagnostics: analysis.diagnostics,
					message: null,
					solution: analysis.solution
				}
			: {
					requestId,
					ok: false,
					diagnostics: analysis.diagnostics,
					message: analysis.message ?? 'The pinmux solver could not find a valid routing.',
					solution: analysis.solution
				};

		workerScope.postMessage(response);
	} catch (error) {
		const response: PinmuxSolveResponse = {
			requestId,
			ok: false,
			diagnostics: [
				{
					id: `pinmux-worker-crash-${requestId}`,
					level: 'error',
					message:
						error instanceof Error
							? error.message
							: 'The pinmux solver worker crashed while analyzing the current selections.'
				}
			],
			message: 'The pinmux solver worker crashed while analyzing the current selections.',
			solution: {
				assignments: [],
				pinStates: [],
				peripheralStates: []
			}
		};

		workerScope.postMessage(response);
	}
};