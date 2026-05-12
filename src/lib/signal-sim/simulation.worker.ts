/// <reference lib="webworker" />

import { compileProject } from '$lib/signal-sim/compiler';
import { simulateCompiledProject } from '$lib/signal-sim/runtime';
import type { SimulationRunRequest, SimulationRunResponse } from '$lib/signal-sim/worker-types';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<SimulationRunRequest>) => {
	const { requestId, project } = event.data;
	const compiled = compileProject(project);

	if (compiled.summary.hasErrors) {
		const response: SimulationRunResponse = {
			requestId,
			ok: false,
			compiled: compiled.summary,
			diagnostics: compiled.diagnostics,
			message: 'The simulator could not run because the graph failed compilation.'
		};

		workerScope.postMessage(response);
		return;
	}

	try {
		const result = simulateCompiledProject(compiled);
		const runtimeFailed = result.diagnostics.some((diagnostic) => diagnostic.level === 'error');

		if (runtimeFailed) {
			const response: SimulationRunResponse = {
				requestId,
				ok: false,
				compiled: result.compiled,
				diagnostics: result.diagnostics,
				message: 'The simulator encountered runtime diagnostics while evaluating the graph.'
			};

			workerScope.postMessage(response);
			return;
		}

		const response: SimulationRunResponse = {
			requestId,
			ok: true,
			...result
		};

		workerScope.postMessage(response);
	} catch (error) {
		const response: SimulationRunResponse = {
			requestId,
			ok: false,
			compiled: compiled.summary,
			diagnostics: [
				...compiled.diagnostics,
				{
					id: `runtime-crash-${requestId}`,
					level: 'error',
					message:
						error instanceof Error
							? error.message
							: 'The simulation worker crashed while running the graph.'
				}
			],
			message: 'The simulation worker crashed while running the graph.'
		};

		workerScope.postMessage(response);
	}
};