import {
	createSignalKey,
	type CompiledProject,
	type SimulationDiagnostic,
	type SimulationRunPayload
} from '$lib/signal-sim/worker-types';

interface IntegratorState {
	position: number;
}

interface DifferentiatorState {
	previousInput: number;
}

interface MotorState {
	position: number;
	velocity: number;
	acceleration: number;
	electricalAngle: number;
	currentD: number;
	currentQ: number;
	torque: number;
}

interface EncoderState {
	heldPosition: number;
	heldVelocity: number;
	heldCounts: number;
	heldElectricalAngle: number;
	previousSamplePosition: number;
	sampleSteps: number;
}

interface QueueDelayState {
	queue: number[];
}

interface ZeroOrderHoldState {
	heldValue: number;
	sampleSteps: number;
}

interface CsvTimedSample {
	time: number;
	value: number;
}

type CsvSourceData =
	| {
			mode: 'indexed';
			values: number[];
	  }
	| {
			mode: 'timed';
			samples: CsvTimedSample[];
	  };

const TAU = Math.PI * 2;
const SQRT_THREE = Math.sqrt(3);

interface RuntimeContext {
	signalValues: Record<string, number>;
	stateMap: Map<
		string,
		| IntegratorState
		| DifferentiatorState
		| MotorState
		| EncoderState
		| QueueDelayState
		| ZeroOrderHoldState
	>;
	diagnostics: SimulationDiagnostic[];
	timeSourceEvaluators: Map<string, (time: number) => number>;
	csvSources: Map<string, CsvSourceData>;
}

function getNumericParameter(parameters: Record<string, unknown>, key: string, fallback = 0): number {
	const value = parameters[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getTextParameter(parameters: Record<string, unknown>, key: string, fallback = ''): string {
	const value = parameters[key];
	return typeof value === 'string' ? value : fallback;
}

function clampValue(value: number, min: number, max: number): number {
	const lower = Math.min(min, max);
	const upper = Math.max(min, max);
	return Math.min(Math.max(value, lower), upper);
}

function wrapAngle(value: number): number {
	let wrapped = value % TAU;
	if (wrapped < 0) {
		wrapped += TAU;
	}

	return wrapped;
}

function computeAlphaBetaFromUVW(u: number, v: number, w: number): { alpha: number; beta: number } {
	return {
		alpha: (2 / 3) * (u - 0.5 * v - 0.5 * w),
		beta: (v - w) / SQRT_THREE
	};
}

function computeDQFromAlphaBeta(
	alpha: number,
	beta: number,
	electricalAngle: number
): { d: number; q: number } {
	return {
		d: alpha * Math.cos(electricalAngle) + beta * Math.sin(electricalAngle),
		q: -alpha * Math.sin(electricalAngle) + beta * Math.cos(electricalAngle)
	};
}

function computeAlphaBetaFromDQ(
	d: number,
	q: number,
	electricalAngle: number
): { alpha: number; beta: number } {
	return {
		alpha: d * Math.cos(electricalAngle) - q * Math.sin(electricalAngle),
		beta: d * Math.sin(electricalAngle) + q * Math.cos(electricalAngle)
	};
}

function computeUVWFromAlphaBeta(alpha: number, beta: number): { u: number; v: number; w: number } {
	return {
		u: alpha,
		v: -0.5 * alpha + (SQRT_THREE / 2) * beta,
		w: -0.5 * alpha - (SQRT_THREE / 2) * beta
	};
}

function quantizePosition(
	position: number,
	countsPerUnit: number,
	positionOffset: number
): { counts: number; position: number } {
	const counts = Math.round((position + positionOffset) * countsPerUnit);
	return {
		counts,
		position: counts / countsPerUnit - positionOffset
	};
}

function getInputValue(
	context: RuntimeContext,
	connections: Record<string, { signalKey: string } | null>,
	portId: string
): number {
	const connection = connections[portId];
	if (!connection) {
		return 0;
	}

	return context.signalValues[connection.signalKey] ?? 0;
}

function compileTimeSource(expression: string, nodeLabel: string): (time: number) => number {
	const compiledExpression = new Function(
		't',
		'Math',
		`const { abs, acos, asin, atan, ceil, cos, exp, floor, log, max, min, PI, pow, round, sign, sin, sqrt, tan } = Math; return (${expression});`
	) as (time: number, math: Math) => number;

	return (time: number) => {
		const value = compiledExpression(time, Math);
		if (!Number.isFinite(value)) {
			throw new Error(`Expression for ${nodeLabel} returned a non-finite value.`);
		}

		return value;
	};
}

function parseCsvSource(csvData: string, nodeLabel: string): CsvSourceData {
	const rows = csvData
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'));

	if (rows.length === 0) {
		throw new Error(`CSV source for ${nodeLabel} is empty.`);
	}

	const numericRows = rows
		.map((line) =>
			line
				.split(/[;,\t]/)
				.map((token) => token.trim())
				.filter((token) => token.length > 0)
				.map((token) => Number(token))
				.filter((value) => Number.isFinite(value))
		)
		.filter((row) => row.length > 0);

	if (numericRows.length === 0) {
		throw new Error(`CSV source for ${nodeLabel} does not contain any numeric rows.`);
	}

	if (numericRows[0].length >= 2) {
		if (numericRows.some((row) => row.length < 2)) {
			throw new Error(`CSV source for ${nodeLabel} mixes one-column rows with time,value rows.`);
		}

		return {
			mode: 'timed',
			samples: numericRows
				.map((row) => ({ time: row[0], value: row[1] }))
				.sort((left, right) => left.time - right.time)
		};
	}

	return {
		mode: 'indexed',
		values: numericRows.map((row) => row[0])
	};
}

function getCsvSourceValue(source: CsvSourceData, time: number, stepIndex: number): number {
	if (source.mode === 'indexed') {
		if (source.values.length === 0) {
			return 0;
		}

		return source.values[Math.min(stepIndex, source.values.length - 1)] ?? 0;
	}

	if (source.samples.length === 0) {
		return 0;
	}

	let activeValue = time < source.samples[0].time ? 0 : source.samples[0].value;
	for (const sample of source.samples) {
		if (sample.time > time) {
			break;
		}

		activeValue = sample.value;
	}

	return activeValue;
}

function evaluateSummingNode(
	context: RuntimeContext,
	node: CompiledProject['nodes'][number],
	legs: Array<{ portId: string; parameterKey?: string; defaultOperation?: 'add' | 'subtract' }>
) {
	let total = 0;

	for (let index = 0; index < legs.length; index += 1) {
		const leg = legs[index];
		const inputValue = getInputValue(context, node.inputConnections, leg.portId);

		if (index === 0) {
			total = inputValue;
			continue;
		}

		const operation = getTextParameter(
			node.parameters,
			leg.parameterKey ?? '',
			leg.defaultOperation ?? 'add'
		);
		total += operation === 'subtract' ? -inputValue : inputValue;
	}

	context.signalValues[createSignalKey(node.id, 'out')] = total;
}

function initializeRuntimeContext(compiled: CompiledProject): RuntimeContext {
	const signalValues: Record<string, number> = {};
	const stateMap = new Map<
		string,
		| IntegratorState
		| DifferentiatorState
		| MotorState
		| EncoderState
		| QueueDelayState
		| ZeroOrderHoldState
	>();
	const diagnostics: SimulationDiagnostic[] = [];
	const timeSourceEvaluators = new Map<string, (time: number) => number>();
	const csvSources = new Map<string, CsvSourceData>();
	const dt = compiled.simulation.stepSize;

	for (const node of compiled.nodes) {
		switch (node.blockType) {
			case 'integrator': {
				stateMap.set(node.id, {
					position: getNumericParameter(node.parameters, 'initialValue', 0)
				});
				break;
			}
			case 'differentiator': {
				stateMap.set(node.id, {
					previousInput: getNumericParameter(node.parameters, 'initialInput', 0)
				});
				break;
			}
				case 'inverter-bldc': {
					const polePairs = Math.max(1, Math.round(getNumericParameter(node.parameters, 'polePairs', 4)));
					const initialPosition = getNumericParameter(node.parameters, 'initialPosition', 0);
					const initialVelocity = getNumericParameter(node.parameters, 'initialVelocity', 0);
					stateMap.set(node.id, {
						position: initialPosition,
						velocity: initialVelocity,
						acceleration: 0,
						electricalAngle: wrapAngle(initialPosition * TAU * polePairs),
						currentD: 0,
						currentQ: 0,
						torque: 0
					});
					break;
				}
				case 'encoder': {
					const countsPerUnit = Math.max(
						1,
						Math.round(getNumericParameter(node.parameters, 'countsPerUnit', 2048))
					);
					const positionOffset = getNumericParameter(node.parameters, 'positionOffset', 0);
					const polePairs = Math.max(1, Math.round(getNumericParameter(node.parameters, 'polePairs', 4)));
					const samplePeriod = Math.max(dt, getNumericParameter(node.parameters, 'samplePeriod', dt));
					const sampleSteps = Math.max(1, Math.round(samplePeriod / dt));
					const quantized = quantizePosition(0, countsPerUnit, positionOffset);
					stateMap.set(node.id, {
						heldPosition: quantized.position,
						heldVelocity: 0,
						heldCounts: quantized.counts,
						heldElectricalAngle: wrapAngle(quantized.position * TAU * polePairs),
						previousSamplePosition: quantized.position,
						sampleSteps
					});
					break;
				}
			case 'delay': {
				const rawDelaySeconds = Math.max(0, getNumericParameter(node.parameters, 'delaySeconds', 0));
				const delaySteps = Math.max(1, Math.ceil(rawDelaySeconds / dt));
				stateMap.set(node.id, {
					queue: new Array(delaySteps).fill(getNumericParameter(node.parameters, 'initialValue', 0))
				});
				break;
			}
			case 'sample-delay': {
				const delaySteps = Math.max(1, Math.round(getNumericParameter(node.parameters, 'steps', 1)));
				stateMap.set(node.id, {
					queue: new Array(delaySteps).fill(getNumericParameter(node.parameters, 'initialValue', 0))
				});
				break;
			}
			case 'zero-order-hold': {
				const samplePeriod = Math.max(dt, getNumericParameter(node.parameters, 'samplePeriod', dt));
				const sampleSteps = Math.max(1, Math.round(samplePeriod / dt));
				stateMap.set(node.id, {
					heldValue: 0,
					sampleSteps
				});
				break;
			}
			case 'time-source': {
				const expression = getTextParameter(node.parameters, 'expression', '0');
				try {
					timeSourceEvaluators.set(node.id, compileTimeSource(expression, node.label));
				} catch (error) {
					diagnostics.push({
						id: `time-source-compile-${node.id}`,
						level: 'error',
						message:
							error instanceof Error
								? error.message
								: `Expression for ${node.label} could not be compiled.`,
						nodeId: node.id
					});
				}
				break;
			}
			case 'csv-source': {
				const csvData = getTextParameter(node.parameters, 'csvData', '');
				try {
					csvSources.set(node.id, parseCsvSource(csvData, node.label));
				} catch (error) {
					diagnostics.push({
						id: `csv-source-parse-${node.id}`,
						level: 'error',
						message:
							error instanceof Error
								? error.message
								: `CSV data for ${node.label} could not be parsed.`,
						nodeId: node.id
					});
				}
				break;
			}
		}

		for (const outputPortId of node.outputPortIds) {
			signalValues[createSignalKey(node.id, outputPortId)] = 0;
		}
	}

	return {
		signalValues,
		stateMap,
		diagnostics,
		timeSourceEvaluators,
		csvSources
	};
}

function evaluateSourceNode(
	context: RuntimeContext,
	node: CompiledProject['nodes'][number],
	time: number,
	stepIndex: number
) {
	switch (node.blockType) {
		case 'step-source': {
			const initialValue = getNumericParameter(node.parameters, 'initialValue', 0);
			const finalValue = getNumericParameter(node.parameters, 'finalValue', 1);
			const stepTime = Math.max(0, getNumericParameter(node.parameters, 'stepTime', 0));
			context.signalValues[createSignalKey(node.id, 'out')] = time >= stepTime ? finalValue : initialValue;
			break;
		}
		case 'impulse-source': {
			const amplitude = getNumericParameter(node.parameters, 'amplitude', 1);
			const sampleIndex = Math.max(0, Math.round(getNumericParameter(node.parameters, 'sampleIndex', 0)));
			context.signalValues[createSignalKey(node.id, 'out')] = stepIndex === sampleIndex ? amplitude : 0;
			break;
		}
		case 'csv-source': {
			const source = context.csvSources.get(node.id);
			context.signalValues[createSignalKey(node.id, 'out')] =
				source ? getCsvSourceValue(source, time, stepIndex) : 0;
			break;
		}
		case 'time-source': {
			const evaluator = context.timeSourceEvaluators.get(node.id);
			if (!evaluator) {
				context.signalValues[createSignalKey(node.id, 'out')] = 0;
				break;
			}

			try {
				context.signalValues[createSignalKey(node.id, 'out')] = evaluator(time);
			} catch (error) {
				context.signalValues[createSignalKey(node.id, 'out')] = 0;
				context.diagnostics.push({
					id: `time-source-eval-${node.id}-${time}`,
					level: 'error',
					message:
						error instanceof Error
							? error.message
							: `Expression for ${node.label} failed during evaluation.`,
					nodeId: node.id
				});
			}
			break;
		}
	}
}

function emitStatefulOutputs(context: RuntimeContext, node: CompiledProject['nodes'][number]) {
	switch (node.blockType) {
		case 'integrator': {
			const state = context.stateMap.get(node.id) as IntegratorState | undefined;
			context.signalValues[createSignalKey(node.id, 'out')] = state?.position ?? 0;
			break;
		}
		case 'inverter-bldc': {
			const state = context.stateMap.get(node.id) as MotorState | undefined;
			const currents = state
				? computeUVWFromAlphaBeta(
						computeAlphaBetaFromDQ(state.currentD, state.currentQ, state.electricalAngle).alpha,
						computeAlphaBetaFromDQ(state.currentD, state.currentQ, state.electricalAngle).beta
					)
				: null;
			context.signalValues[createSignalKey(node.id, 'pos')] = state?.position ?? 0;
			context.signalValues[createSignalKey(node.id, 'vel')] = state?.velocity ?? 0;
			context.signalValues[createSignalKey(node.id, 'accel')] = state?.acceleration ?? 0;
			context.signalValues[createSignalKey(node.id, 'thetaE')] = state?.electricalAngle ?? 0;
			context.signalValues[createSignalKey(node.id, 'iU')] = currents?.u ?? 0;
			context.signalValues[createSignalKey(node.id, 'iV')] = currents?.v ?? 0;
			context.signalValues[createSignalKey(node.id, 'iW')] = currents?.w ?? 0;
			context.signalValues[createSignalKey(node.id, 'torque')] = state?.torque ?? 0;
			break;
		}
		case 'encoder': {
			const state = context.stateMap.get(node.id) as EncoderState | undefined;
			context.signalValues[createSignalKey(node.id, 'pos')] = state?.heldPosition ?? 0;
			context.signalValues[createSignalKey(node.id, 'vel')] = state?.heldVelocity ?? 0;
			context.signalValues[createSignalKey(node.id, 'counts')] = state?.heldCounts ?? 0;
			context.signalValues[createSignalKey(node.id, 'thetaE')] = state?.heldElectricalAngle ?? 0;
			break;
		}
		case 'delay': {
			const state = context.stateMap.get(node.id) as QueueDelayState | undefined;
			context.signalValues[createSignalKey(node.id, 'out')] = state?.queue[0] ?? 0;
			break;
		}
		case 'sample-delay': {
			const state = context.stateMap.get(node.id) as QueueDelayState | undefined;
			context.signalValues[createSignalKey(node.id, 'out')] = state?.queue[0] ?? 0;
			break;
		}
		case 'zero-order-hold': {
			const state = context.stateMap.get(node.id) as ZeroOrderHoldState | undefined;
			context.signalValues[createSignalKey(node.id, 'out')] = state?.heldValue ?? 0;
			break;
		}
	}
}

function evaluateAlgebraicNode(
	context: RuntimeContext,
	node: CompiledProject['nodes'][number],
	dt: number
) {
	switch (node.blockType) {
		case 'gain': {
			const gain = getNumericParameter(node.parameters, 'gain', 1);
			const input = getInputValue(context, node.inputConnections, 'in');
			context.signalValues[createSignalKey(node.id, 'out')] = input * gain;
			break;
		}
		case 'signal-clamp': {
			const input = getInputValue(context, node.inputConnections, 'in');
			const min = getNumericParameter(node.parameters, 'min', -1);
			const max = getNumericParameter(node.parameters, 'max', 1);
			context.signalValues[createSignalKey(node.id, 'out')] = clampValue(input, min, max);
			break;
		}
		case 'route-pin': {
			context.signalValues[createSignalKey(node.id, 'out')] = getInputValue(
				context,
				node.inputConnections,
				'in'
			);
			break;
		}
		case 'differentiator': {
			const state = context.stateMap.get(node.id) as DifferentiatorState | undefined;
			const input = getInputValue(context, node.inputConnections, 'in');
			const previousInput = state?.previousInput ?? input;
			context.signalValues[createSignalKey(node.id, 'out')] = (input - previousInput) / dt;
			break;
		}
		case 'clarke': {
			const u = getInputValue(context, node.inputConnections, 'u');
			const v = getInputValue(context, node.inputConnections, 'v');
			const w = getInputValue(context, node.inputConnections, 'w');
			const components = computeAlphaBetaFromUVW(u, v, w);
			context.signalValues[createSignalKey(node.id, 'alpha')] = components.alpha;
			context.signalValues[createSignalKey(node.id, 'beta')] = components.beta;
			break;
		}
		case 'park': {
			const alpha = getInputValue(context, node.inputConnections, 'alpha');
			const beta = getInputValue(context, node.inputConnections, 'beta');
			const theta = getInputValue(context, node.inputConnections, 'theta');
			const components = computeDQFromAlphaBeta(alpha, beta, theta);
			context.signalValues[createSignalKey(node.id, 'd')] = components.d;
			context.signalValues[createSignalKey(node.id, 'q')] = components.q;
			break;
		}
		case 'inverse-park': {
			const d = getInputValue(context, node.inputConnections, 'd');
			const q = getInputValue(context, node.inputConnections, 'q');
			const theta = getInputValue(context, node.inputConnections, 'theta');
			const components = computeAlphaBetaFromDQ(d, q, theta);
			context.signalValues[createSignalKey(node.id, 'alpha')] = components.alpha;
			context.signalValues[createSignalKey(node.id, 'beta')] = components.beta;
			break;
		}
		case 'inverse-clarke': {
			const alpha = getInputValue(context, node.inputConnections, 'alpha');
			const beta = getInputValue(context, node.inputConnections, 'beta');
			const components = computeUVWFromAlphaBeta(alpha, beta);
			context.signalValues[createSignalKey(node.id, 'u')] = components.u;
			context.signalValues[createSignalKey(node.id, 'v')] = components.v;
			context.signalValues[createSignalKey(node.id, 'w')] = components.w;
			break;
		}
		case 'sum': {
			evaluateSummingNode(context, node, [
				{ portId: 'a' },
				{ portId: 'b', parameterKey: 'operation', defaultOperation: 'subtract' }
			]);
			break;
		}
		case 'sum-3': {
			evaluateSummingNode(context, node, [
				{ portId: 'a' },
				{ portId: 'b', parameterKey: 'operationB', defaultOperation: 'subtract' },
				{ portId: 'c', parameterKey: 'operationC', defaultOperation: 'add' }
			]);
			break;
		}
		case 'sum-4': {
			evaluateSummingNode(context, node, [
				{ portId: 'a' },
				{ portId: 'b', parameterKey: 'operationB', defaultOperation: 'subtract' },
				{ portId: 'c', parameterKey: 'operationC', defaultOperation: 'add' },
				{ portId: 'd', parameterKey: 'operationD', defaultOperation: 'add' }
			]);
			break;
		}
		case 'probe':
			break;
	}
}

function updatePostEvaluationState(context: RuntimeContext, node: CompiledProject['nodes'][number]) {
	switch (node.blockType) {
		case 'differentiator': {
			const state = context.stateMap.get(node.id) as DifferentiatorState | undefined;
			if (!state) {
				return;
			}

			state.previousInput = getInputValue(context, node.inputConnections, 'in');
			break;
		}
	}
}

function updateStatefulNodes(
	context: RuntimeContext,
	node: CompiledProject['nodes'][number],
	stepIndex: number,
	dt: number
) {
	switch (node.blockType) {
		case 'integrator': {
			const state = context.stateMap.get(node.id) as IntegratorState | undefined;
			if (!state) {
				return;
			}

			state.position += dt * getInputValue(context, node.inputConnections, 'in');
			break;
		}
		case 'inverter-bldc': {
			const state = context.stateMap.get(node.id) as MotorState | undefined;
			if (!state) {
				return;
			}

			const uEffort = clampValue(getInputValue(context, node.inputConnections, 'uEffort'), -1, 1);
			const vEffort = clampValue(getInputValue(context, node.inputConnections, 'vEffort'), -1, 1);
			const wEffort = clampValue(getInputValue(context, node.inputConnections, 'wEffort'), -1, 1);
			const loadTorqueInput = getInputValue(context, node.inputConnections, 'loadTorque');
			const polePairs = Math.max(1, Math.round(getNumericParameter(node.parameters, 'polePairs', 4)));
			const kv = Math.max(1, getNumericParameter(node.parameters, 'kv', 120));
			const currentPerUnit = Math.max(0.1, getNumericParameter(node.parameters, 'currentPerUnit', 6));
			const electricalTimeConstant = Math.max(
				dt,
				getNumericParameter(node.parameters, 'electricalTimeConstant', 0.01)
			);
			const inertia = Math.max(0.0001, getNumericParameter(node.parameters, 'inertia', 0.02));
			const viscousDamping = Math.max(
				0,
				getNumericParameter(node.parameters, 'viscousDamping', 0.08)
			);
			const coulombFriction = Math.max(
				0,
				getNumericParameter(node.parameters, 'coulombFriction', 0.02)
			);
			const constantLoadTorque = getNumericParameter(node.parameters, 'constantLoadTorque', 0.05);
			const coggingTorque = getNumericParameter(node.parameters, 'coggingTorque', 0.01);
			const alphaBetaEffort = computeAlphaBetaFromUVW(uEffort, vEffort, wEffort);
			const dqEffort = computeDQFromAlphaBeta(
				alphaBetaEffort.alpha,
				alphaBetaEffort.beta,
				state.electricalAngle
			);
			const maxMechanicalSpeed = Math.max(0.001, (kv * TAU) / 60);
			const normalizedBackEmf = clampValue(state.velocity / maxMechanicalSpeed, -1, 1);
			const targetCurrentD = currentPerUnit * dqEffort.d;
			const targetCurrentQ =
				currentPerUnit * clampValue(dqEffort.q - normalizedBackEmf, -1, 1);
			state.currentD += dt * (targetCurrentD - state.currentD) / electricalTimeConstant;
			state.currentQ += dt * (targetCurrentQ - state.currentQ) / electricalTimeConstant;
			const torqueConstant = 60 / (TAU * kv);
			const electromagneticTorque = torqueConstant * state.currentQ;
			const viscousLoad = viscousDamping * state.velocity;
			const frictionDirection =
				Math.abs(state.velocity) > 1e-6
					? Math.sign(state.velocity)
					: Math.sign(electromagneticTorque - constantLoadTorque - loadTorqueInput);
			const coulombLoad = coulombFriction * frictionDirection;
			const coggingLoad = coggingTorque * Math.sin(state.electricalAngle);
			const netTorque =
				electromagneticTorque - constantLoadTorque - loadTorqueInput - viscousLoad - coulombLoad - coggingLoad;

			state.torque = electromagneticTorque;
			state.acceleration = netTorque / inertia;
			state.velocity += dt * state.acceleration;
			state.position += dt * state.velocity;
			state.electricalAngle = wrapAngle(state.position * TAU * polePairs);
			break;
		}
		case 'encoder': {
			const state = context.stateMap.get(node.id) as EncoderState | undefined;
			if (!state) {
				return;
			}

			if ((stepIndex + 1) % state.sampleSteps === 0) {
				const rawPosition = getInputValue(context, node.inputConnections, 'pos');
				const countsPerUnit = Math.max(
					1,
					Math.round(getNumericParameter(node.parameters, 'countsPerUnit', 2048))
				);
				const positionOffset = getNumericParameter(node.parameters, 'positionOffset', 0);
				const polePairs = Math.max(1, Math.round(getNumericParameter(node.parameters, 'polePairs', 4)));
				const quantized = quantizePosition(rawPosition, countsPerUnit, positionOffset);
				const samplePeriod = state.sampleSteps * dt;

				state.heldCounts = quantized.counts;
				state.heldPosition = quantized.position;
				state.heldVelocity = (quantized.position - state.previousSamplePosition) / samplePeriod;
				state.previousSamplePosition = quantized.position;
				state.heldElectricalAngle = wrapAngle(quantized.position * TAU * polePairs);
			}
			break;
		}
		case 'delay': {
			const state = context.stateMap.get(node.id) as QueueDelayState | undefined;
			if (!state) {
				return;
			}

			state.queue.shift();
			state.queue.push(getInputValue(context, node.inputConnections, 'in'));
			break;
		}
		case 'sample-delay': {
			const state = context.stateMap.get(node.id) as QueueDelayState | undefined;
			if (!state) {
				return;
			}

			state.queue.shift();
			state.queue.push(getInputValue(context, node.inputConnections, 'in'));
			break;
		}
		case 'zero-order-hold': {
			const state = context.stateMap.get(node.id) as ZeroOrderHoldState | undefined;
			if (!state) {
				return;
			}

			if ((stepIndex + 1) % state.sampleSteps === 0) {
				state.heldValue = getInputValue(context, node.inputConnections, 'in');
			}
			break;
		}
	}
}

export function simulateCompiledProject(compiled: CompiledProject): SimulationRunPayload {
	const context = initializeRuntimeContext(compiled);
	const dt = compiled.simulation.stepSize;
	const sampleCount = compiled.summary.sampleCount;
	const times = new Array<number>(sampleCount);
	const seriesBuffers = Object.fromEntries(
		compiled.signals.map((descriptor) => [descriptor.key, new Array<number>(sampleCount).fill(0)])
	) as Record<string, number[]>;
	const nodeLookup = new Map(compiled.nodes.map((node) => [node.id, node]));

	for (let stepIndex = 0; stepIndex < sampleCount; stepIndex += 1) {
		const time = stepIndex * dt;
		times[stepIndex] = time;

		for (const nodeId of compiled.sourceNodeIds) {
			const node = nodeLookup.get(nodeId);
			if (node) {
				evaluateSourceNode(context, node, time, stepIndex);
			}
		}

		for (const nodeId of compiled.statefulNodeIds) {
			const node = nodeLookup.get(nodeId);
			if (node) {
				emitStatefulOutputs(context, node);
			}
		}

		for (const nodeId of compiled.evaluationOrder) {
			const node = nodeLookup.get(nodeId);
			if (node) {
				evaluateAlgebraicNode(context, node, dt);
			}
		}

		for (const descriptor of compiled.signals) {
			seriesBuffers[descriptor.key][stepIndex] = context.signalValues[descriptor.key] ?? 0;
		}

		if (stepIndex === sampleCount - 1) {
			continue;
		}

		for (const nodeId of compiled.statefulNodeIds) {
			const node = nodeLookup.get(nodeId);
			if (node) {
				updateStatefulNodes(context, node, stepIndex, dt);
			}
		}

		for (const node of compiled.nodes) {
			updatePostEvaluationState(context, node);
		}
	}

	return {
		compiled: compiled.summary,
		diagnostics: [...compiled.diagnostics, ...context.diagnostics],
		times,
		series: compiled.signals.map((descriptor) => ({
			...descriptor,
			values: seriesBuffers[descriptor.key]
		}))
	};
}