import type { XYPosition } from '@xyflow/svelte';

import {
	createEmptyProjectDocument,
	type BlockDefinition,
	type BlockParameterValue,
	type OutputDefinition,
	type ProjectDocument,
	type SimulatorNodeDocument
} from '$lib/signal-sim/model';

function createSummingJunctionDefinition(
	type: string,
	title: string,
	shortLabel: string,
	inputCount: 2 | 3 | 4
): BlockDefinition {
	const inputIds = ['a', 'b', 'c', 'd'].slice(0, inputCount);

	return {
		type,
		title,
		shortLabel,
		category: 'Arithmetic',
		description:
			inputCount === 2
				? 'Two-input sum with selectable sign on the second leg.'
				: `${inputCount}-input sum with configurable sign on each additional leg.`,
		tags: ['sum', 'subtract', 'feedback'],
		supportsState: false,
		inputs: inputIds.map((inputId) => ({
			id: inputId,
			label: inputId.toUpperCase(),
			direction: 'input',
			signalKind: 'scalar',
			timingMode: 'hybrid'
		})),
		outputs: [
			{
				id: 'out',
				label: 'Sum',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: inputIds.slice(1).map((inputId, index) => ({
			key: inputCount === 2 && inputId === 'b' ? 'operation' : `operation${inputId.toUpperCase()}`,
			label:
				inputCount === 2 && inputId === 'b'
					? 'Second Leg'
					: `${inputId.toUpperCase()} Leg`,
			kind: 'select',
			defaultValue: index === 0 ? 'subtract' : 'add',
			options: [
				{ label: '+', value: 'add' },
				{ label: '-', value: 'subtract' }
			]
		}))
	};
}

const blockRegistry: BlockDefinition[] = [
	{
		type: 'time-source',
		title: 'x(t) Source',
		shortLabel: 'x(t)',
		category: 'Sources',
		description: 'Editable continuous-time expression source for command or disturbance inputs.',
		tags: ['source', 'continuous', 'reference'],
		supportsState: false,
		inputs: [],
		outputs: [
			{
				id: 'out',
				label: 'x(t)',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous',
				description: 'Continuous scalar output.'
			}
		],
		parameters: [
			{
				key: 'expression',
				label: 'Expression',
				kind: 'text',
				defaultValue: 'sin(2 * PI * 50 * t)',
				placeholder: 'sin(2 * PI * f * t)',
				description: 'Continuous source expression evaluated against the runtime clock.'
			},
			{
				key: 'units',
				label: 'Units',
				kind: 'text',
				defaultValue: 'V',
				placeholder: 'A, V, rad/s'
			}
		]
	},
	{
		type: 'step-source',
		title: 'Step Source',
		shortLabel: 'Step',
		category: 'Sources',
		description: 'Piecewise command step for transient response tests.',
		tags: ['source', 'step', 'reference'],
		supportsState: false,
		inputs: [],
		outputs: [
			{
				id: 'out',
				label: 'u',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		parameters: [
			{
				key: 'initialValue',
				label: 'Initial',
				kind: 'number',
				defaultValue: 0,
				step: 0.1
			},
			{
				key: 'finalValue',
				label: 'Final',
				kind: 'number',
				defaultValue: 1,
				step: 0.1
			},
			{
				key: 'stepTime',
				label: 'Step Time',
				kind: 'number',
				defaultValue: 0.02,
				min: 0,
				step: 0.001,
				unit: 's'
			}
		]
	},
	{
		type: 'impulse-source',
		title: 'Discrete Impulse',
		shortLabel: 'IMP',
		category: 'Sources',
		description: 'Single-sample discrete impulse for sampled-domain tests.',
		tags: ['source', 'impulse', 'discrete'],
		supportsState: false,
		inputs: [],
		outputs: [
			{
				id: 'out',
				label: 'u[k]',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			}
		],
		parameters: [
			{
				key: 'amplitude',
				label: 'Amplitude',
				kind: 'number',
				defaultValue: 1,
				step: 0.1
			},
			{
				key: 'sampleIndex',
				label: 'Sample Index',
				kind: 'number',
				defaultValue: 0,
				min: 0,
				step: 1
			}
		]
	},
	{
		type: 'csv-source',
		title: 'CSV Source',
		shortLabel: 'CSV',
		category: 'Sources',
		description: 'Paste a sample column or time,value pairs from CSV to drive an input trace.',
		tags: ['source', 'csv', 'trace'],
		supportsState: false,
		inputs: [],
		outputs: [
			{
				id: 'out',
				label: 'csv',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: [
			{
				key: 'csvData',
				label: 'CSV Data',
				kind: 'textarea',
				defaultValue: '0\n1\n0\n0',
				placeholder: 'value\\n0\\n1\\n0\\n0\\n\\n# or time,value\\n0,0\\n0.02,1',
				description: 'Use one numeric value per row, or two numeric columns as time,value.'
			}
		]
	},
	{
		type: 'gain',
		title: 'Gain',
		shortLabel: 'K',
		category: 'Arithmetic',
		description: 'Scalar multiply block for plant, controller, or unit conversions.',
		tags: ['linear', 'multiply', 'controller'],
		supportsState: false,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: [
			{
				key: 'gain',
				label: 'Gain',
				kind: 'number',
				defaultValue: 1,
				step: 0.1
			}
		]
	},
	{
		type: 'signal-clamp',
		title: 'Signal Clamp',
		shortLabel: 'SAT',
		category: 'Arithmetic',
		description: 'Scalar saturation block with configurable lower and upper limits.',
		tags: ['saturation', 'clamp', 'limit'],
		supportsState: false,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: [
			{
				key: 'min',
				label: 'Min',
				kind: 'number',
				defaultValue: -1,
				step: 0.1
			},
			{
				key: 'max',
				label: 'Max',
				kind: 'number',
				defaultValue: 1,
				step: 0.1
			}
		]
	},
	createSummingJunctionDefinition('sum', 'Summing Junction', 'SUM', 2),
	createSummingJunctionDefinition('sum-3', '3-Input Sum', 'SUM3', 3),
	createSummingJunctionDefinition('sum-4', '4-Input Sum', 'SUM4', 4),
	{
		type: 'route-pin',
		title: 'Route Pin',
		shortLabel: 'PIN',
		category: 'Routing',
		description:
			'Draggable pass-through routing point for tidying long wires without changing signal behavior.',
		tags: ['routing', 'wire', 'layout'],
		supportsState: false,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: []
	},
	{
		type: 'note',
		title: 'Note',
		shortLabel: 'NOTE',
		category: 'Annotations',
		description: 'Flowchart note block for canvas annotations, comments, and setup reminders.',
		tags: ['annotation', 'note', 'textbox'],
		supportsState: false,
		inputs: [],
		outputs: [],
		parameters: [
			{
				key: 'content',
				label: 'Content',
				kind: 'textarea',
				defaultValue: 'Add context, assumptions, or tuning notes here.',
				placeholder: 'Describe the subgraph, expected behavior, or pending work.'
			}
		]
	},
	{
		type: 'clarke',
		title: 'Clarke Transform',
		shortLabel: 'Clarke',
		category: 'Motor Control',
		description: 'Transforms three-phase U/V/W signals into alpha/beta components.',
		tags: ['foc', 'clarke', 'transform', 'uvw'],
		supportsState: false,
		inputs: [
			{
				id: 'u',
				label: 'U',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'v',
				label: 'V',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'w',
				label: 'W',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'alpha',
				label: 'Alpha',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'beta',
				label: 'Beta',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: []
	},
	{
		type: 'park',
		title: 'Park Transform',
		shortLabel: 'Park',
		category: 'Motor Control',
		description: 'Transforms alpha/beta feedback into d/q components using electrical angle.',
		tags: ['foc', 'park', 'transform'],
		supportsState: false,
		inputs: [
			{
				id: 'alpha',
				label: 'Alpha',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'beta',
				label: 'Beta',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'theta',
				label: 'Theta_e',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'd',
				label: 'D',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'q',
				label: 'Q',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: []
	},
	{
		type: 'inverse-park',
		title: 'Inverse Park',
		shortLabel: 'InvPark',
		category: 'Motor Control',
		description: 'Transforms d/q effort commands into alpha/beta components using electrical angle.',
		tags: ['foc', 'park', 'transform'],
		supportsState: false,
		inputs: [
			{
				id: 'd',
				label: 'D',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'q',
				label: 'Q',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'theta',
				label: 'Theta_e',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'alpha',
				label: 'Alpha',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'beta',
				label: 'Beta',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: []
	},
	{
		type: 'inverse-clarke',
		title: 'Inverse Clarke',
		shortLabel: 'InvClrk',
		category: 'Motor Control',
		description: 'Transforms alpha/beta commands into balanced three-phase U/V/W efforts.',
		tags: ['foc', 'clarke', 'transform', 'uvw'],
		supportsState: false,
		inputs: [
			{
				id: 'alpha',
				label: 'Alpha',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'beta',
				label: 'Beta',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'u',
				label: 'U',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'v',
				label: 'V',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'w',
				label: 'W',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		parameters: []
	},
	{
		type: 'integrator',
		title: 'Integrator',
		shortLabel: 'INT',
		category: 'Dynamics',
		description: 'Continuous state accumulator, ready for fixed-step integration in the next slice.',
		tags: ['state', 'continuous', 'plant'],
		supportsState: true,
		inputs: [
			{
				id: 'in',
				label: 'dx/dt',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'x',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		parameters: [
			{
				key: 'initialValue',
				label: 'Initial Value',
				kind: 'number',
				defaultValue: 0,
				step: 0.1
			}
		]
	},
	{
		type: 'differentiator',
		title: 'Differentiator',
		shortLabel: 'd/dt',
		category: 'Dynamics',
		description: 'Backward-difference differentiator referenced to the fixed solver timestep.',
		tags: ['derivative', 'dynamics', 'continuous'],
		supportsState: true,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		parameters: [
			{
				key: 'initialInput',
				label: 'Initial Input',
				kind: 'number',
				defaultValue: 0,
				step: 0.1
			}
		]
	},
	{
		type: 'inverter-bldc',
		title: 'Inverter + BLDC',
		shortLabel: 'BLDC',
		category: 'Motor Control',
		description:
			'Three-phase effort input, simplified current dynamics, BLDC torque generation, and kinematics outputs with configurable internal and external load torque.',
		tags: ['motor', 'bldc', 'inverter', 'plant'],
		supportsState: true,
		inputs: [
			{
				id: 'uEffort',
				label: 'U Effort',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'vEffort',
				label: 'V Effort',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'wEffort',
				label: 'W Effort',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			},
			{
				id: 'loadTorque',
				label: 'Load Torque',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [
			{
				id: 'pos',
				label: 'Pos',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'vel',
				label: 'Vel',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'accel',
				label: 'Accel',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'thetaE',
				label: 'Theta_e',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'iU',
				label: 'Iu',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'iV',
				label: 'Iv',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'iW',
				label: 'Iw',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'torque',
				label: 'Torque',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		parameters: [
			{
				key: 'polePairs',
				label: 'Pole Pairs',
				kind: 'number',
				defaultValue: 4,
				min: 1,
				step: 1
			},
			{
				key: 'kv',
				label: 'Kv',
				kind: 'number',
				defaultValue: 120,
				min: 1,
				step: 1,
				unit: 'rpm/V'
			},
			{
				key: 'coggingTorque',
				label: 'Cogging Torque',
				kind: 'number',
				defaultValue: 0.01,
				step: 0.01
			},
			{
				key: 'currentPerUnit',
				label: 'Current / Effort',
				kind: 'number',
				defaultValue: 6,
				min: 0.1,
				step: 0.1
			},
			{
				key: 'electricalTimeConstant',
				label: 'Electrical Tau',
				kind: 'number',
				defaultValue: 0.01,
				min: 0.0001,
				step: 0.001,
				unit: 's'
			},
			{
				key: 'inertia',
				label: 'Inertia',
				kind: 'number',
				defaultValue: 0.02,
				min: 0.0001,
				step: 0.01
			},
			{
				key: 'viscousDamping',
				label: 'Viscous Damping',
				kind: 'number',
				defaultValue: 0.08,
				min: 0,
				step: 0.01
			},
			{
				key: 'coulombFriction',
				label: 'Coulomb Friction',
				kind: 'number',
				defaultValue: 0.02,
				min: 0,
				step: 0.01
			},
			{
				key: 'constantLoadTorque',
				label: 'Base Load Torque',
				kind: 'number',
				defaultValue: 0.05,
				step: 0.01
			},
			{
				key: 'initialPosition',
				label: 'Initial Pos',
				kind: 'number',
				defaultValue: 0,
				step: 0.01
			},
			{
				key: 'initialVelocity',
				label: 'Initial Vel',
				kind: 'number',
				defaultValue: 0,
				step: 0.01
			}
		]
	},
	{
		type: 'encoder',
		title: 'Encoder',
		shortLabel: 'ENC',
		category: 'Sensors',
		description:
			'Sampled encoder model that quantizes position into counts and exposes measured position, velocity, and electrical angle.',
		tags: ['sensor', 'encoder', 'measurement'],
		supportsState: true,
		inputs: [
			{
				id: 'pos',
				label: 'Pos',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			},
			{
				id: 'vel',
				label: 'Vel',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		outputs: [
			{
				id: 'pos',
				label: 'Measured Pos',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			},
			{
				id: 'vel',
				label: 'Measured Vel',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			},
			{
				id: 'counts',
				label: 'Counts',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			},
			{
				id: 'thetaE',
				label: 'Theta_e',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			}
		],
		parameters: [
			{
				key: 'countsPerUnit',
				label: 'Counts / Unit',
				kind: 'number',
				defaultValue: 2048,
				min: 1,
				step: 1
			},
			{
				key: 'samplePeriod',
				label: 'Sample Period',
				kind: 'number',
				defaultValue: 0.001,
				min: 0.0001,
				step: 0.0001,
				unit: 's'
			},
			{
				key: 'polePairs',
				label: 'Pole Pairs',
				kind: 'number',
				defaultValue: 4,
				min: 1,
				step: 1
			},
			{
				key: 'positionOffset',
				label: 'Position Offset',
				kind: 'number',
				defaultValue: 0,
				step: 0.01
			}
		]
	},
	{
		type: 'delay',
		title: 'Continuous Delay',
		shortLabel: 'Delay',
		category: 'Timing',
		description: 'Continuous-time transport delay approximated on the fixed-step solver grid.',
		tags: ['delay', 'continuous', 'state'],
		supportsState: true,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		parameters: [
			{
				key: 'delaySeconds',
				label: 'Delay',
				kind: 'number',
				defaultValue: 0.001,
				min: 0.0001,
				step: 0.0005,
				unit: 's'
			},
			{
				key: 'initialValue',
				label: 'Initial Value',
				kind: 'number',
				defaultValue: 0,
				step: 0.1
			}
		]
	},
	{
		type: 'sample-delay',
		title: '1/E Delay',
		shortLabel: '1/E',
		category: 'Timing',
		description: 'Discrete sample delay measured in whole solver timesteps.',
		tags: ['delay', 'discrete', 'state'],
		supportsState: true,
		inputs: [
			{
				id: 'in',
				label: 'In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'discrete'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			}
		],
		parameters: [
			{
				key: 'steps',
				label: 'Steps',
				kind: 'number',
				defaultValue: 1,
				min: 1,
				step: 1
			},
			{
				key: 'initialValue',
				label: 'Initial Value',
				kind: 'number',
				defaultValue: 0,
				step: 0.1
			}
		]
	},
	{
		type: 'zero-order-hold',
		title: 'Zero-Order Hold',
		shortLabel: 'ZOH',
		category: 'Timing',
		description: 'Continuous-to-discrete bridge for sampled controllers and ADC-style capture.',
		tags: ['sampling', 'adc', 'discrete'],
		supportsState: true,
		inputs: [
			{
				id: 'in',
				label: 'Continuous In',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'continuous'
			}
		],
		outputs: [
			{
				id: 'out',
				label: 'Sampled Out',
				direction: 'output',
				signalKind: 'scalar',
				timingMode: 'discrete'
			}
		],
		parameters: [
			{
				key: 'samplePeriod',
				label: 'Sample Period',
				kind: 'number',
				defaultValue: 0.001,
				min: 0.0001,
				step: 0.0001,
				unit: 's'
			}
		]
	},
	{
		type: 'probe',
		title: 'Probe',
		shortLabel: 'Scope',
		category: 'Outputs',
		description: 'Named observation point for future watch variables and scope outputs.',
		tags: ['output', 'scope', 'watch'],
		supportsState: false,
		inputs: [
			{
				id: 'in',
				label: 'Signal',
				direction: 'input',
				signalKind: 'scalar',
				timingMode: 'hybrid'
			}
		],
		outputs: [],
		parameters: [
			{
				key: 'tag',
				label: 'Probe Tag',
				kind: 'text',
				defaultValue: 'scope_A',
				placeholder: 'scope_A'
			}
		]
	}
];

const registryMap = new Map(blockRegistry.map((definition) => [definition.type, definition]));

function buildDefaultParameters(definition: BlockDefinition): Record<string, BlockParameterValue> {
	return Object.fromEntries(
		definition.parameters.map((parameter) => [parameter.key, parameter.defaultValue])
	);
}

export function getBlockDefinitions(): BlockDefinition[] {
	return [...blockRegistry];
}

export function getBlockCatalog(): Array<{ category: string; blocks: BlockDefinition[] }> {
	const grouped = new Map<string, BlockDefinition[]>();

	for (const definition of blockRegistry) {
		grouped.set(definition.category, [...(grouped.get(definition.category) ?? []), definition]);
	}

	return [...grouped.entries()].map(([category, blocks]) => ({ category, blocks }));
}

export function getBlockDefinition(blockType: string): BlockDefinition | undefined {
	return registryMap.get(blockType);
}

export function createNodeFromBlock(blockType: string, position: XYPosition): SimulatorNodeDocument | null {
	const definition = getBlockDefinition(blockType);

	if (!definition) {
		return null;
	}

	return {
		id: crypto.randomUUID(),
		blockType: definition.type,
		label: definition.title,
		position,
		parameters: buildDefaultParameters(definition)
	};
}

export function createOutputDefinition(
	project: ProjectDocument,
	seed?: { nodeId: string; portId: string; label?: string }
): OutputDefinition {
	const outputIndex = project.outputs.length + 1;

	return {
		id: crypto.randomUUID(),
		kind: outputIndex === 1 ? 'plot' : 'value',
		label: seed?.label ?? `Output ${outputIndex}`,
		sourceNodeId: seed?.nodeId ?? null,
		sourcePortId: seed?.portId ?? null,
		color: outputIndex === 1 ? '#00a7d6' : '#f19143'
	};
}

export function createExampleProjectDocument(): ProjectDocument {
	const project = createEmptyProjectDocument('FOC Position Servo Demo');
	project.meta.description =
		'Cascaded position, velocity, and d/q current PI loops with encoder feedback, route-pin wire organization, inverse transforms, and kinematics-derived load torque.';
	project.simulation.duration = 4;
	project.simulation.stepSize = 0.0005;

	const connect = (
		source: SimulatorNodeDocument,
		sourcePortId: string,
		target: SimulatorNodeDocument,
		targetPortId: string,
		label?: string
	) => ({
		id: crypto.randomUUID(),
		source: source.id,
		sourcePortId,
		target: target.id,
		targetPortId,
		...(label ? { label } : {})
	});

	const createRoutePin = (label: string, position: XYPosition) => {
		const node = createNodeFromBlock('route-pin', position);
		if (!node) {
			return null;
		}

		node.label = label;
		return node;
	};

	const positionReference = createNodeFromBlock('step-source', { x: 40, y: 60 });
	const positionError = createNodeFromBlock('sum', { x: 300, y: 60 });
	const positionKp = createNodeFromBlock('gain', { x: 560, y: 0 });
	const positionKi = createNodeFromBlock('gain', { x: 560, y: 120 });
	const positionIntegrator = createNodeFromBlock('integrator', { x: 820, y: 120 });
	const positionControl = createNodeFromBlock('sum', { x: 1080, y: 60 });
	const positionClamp = createNodeFromBlock('signal-clamp', { x: 1340, y: 60 });

	const velocityError = createNodeFromBlock('sum', { x: 300, y: 260 });
	const velocityKp = createNodeFromBlock('gain', { x: 560, y: 200 });
	const velocityKi = createNodeFromBlock('gain', { x: 560, y: 320 });
	const velocityIntegrator = createNodeFromBlock('integrator', { x: 820, y: 320 });
	const velocityControl = createNodeFromBlock('sum', { x: 1080, y: 260 });
	const velocityClamp = createNodeFromBlock('signal-clamp', { x: 1340, y: 260 });

	const directAxisReference = createNodeFromBlock('step-source', { x: 40, y: 500 });
	const directAxisError = createNodeFromBlock('sum', { x: 300, y: 500 });
	const directAxisKp = createNodeFromBlock('gain', { x: 560, y: 440 });
	const directAxisKi = createNodeFromBlock('gain', { x: 560, y: 560 });
	const directAxisIntegrator = createNodeFromBlock('integrator', { x: 820, y: 560 });
	const directAxisControl = createNodeFromBlock('sum', { x: 1080, y: 500 });
	const directAxisClamp = createNodeFromBlock('signal-clamp', { x: 1340, y: 500 });

	const torqueAxisError = createNodeFromBlock('sum', { x: 300, y: 700 });
	const torqueAxisKp = createNodeFromBlock('gain', { x: 560, y: 640 });
	const torqueAxisKi = createNodeFromBlock('gain', { x: 560, y: 760 });
	const torqueAxisIntegrator = createNodeFromBlock('integrator', { x: 820, y: 760 });
	const torqueAxisControl = createNodeFromBlock('sum', { x: 1080, y: 700 });
	const torqueAxisClamp = createNodeFromBlock('signal-clamp', { x: 1340, y: 700 });

	const inversePark = createNodeFromBlock('inverse-park', { x: 1600, y: 600 });
	const inverseClarke = createNodeFromBlock('inverse-clarke', { x: 1860, y: 600 });
	const motor = createNodeFromBlock('inverter-bldc', { x: 2140, y: 560 });
	const encoder = createNodeFromBlock('encoder', { x: 2440, y: 260 });
	const clarke = createNodeFromBlock('clarke', { x: 1860, y: 900 });
	const park = createNodeFromBlock('park', { x: 1600, y: 900 });
	const frictionGain = createNodeFromBlock('gain', { x: 2140, y: 840 });
	const accelerationGain = createNodeFromBlock('gain', { x: 2140, y: 980 });
	const loadSum = createNodeFromBlock('sum', { x: 2440, y: 900 });

	const positionFeedbackRouteRight = createRoutePin('Pos Feedback R', { x: 2260, y: 120 });
	const positionFeedbackRouteLeft = createRoutePin('Pos Feedback L', { x: 180, y: 120 });
	const velocityReferenceRouteRight = createRoutePin('Vel Ref R', { x: 1480, y: 240 });
	const velocityReferenceRouteLeft = createRoutePin('Vel Ref L', { x: 180, y: 240 });
	const velocityFeedbackRouteRight = createRoutePin('Vel Feedback R', { x: 2260, y: 340 });
	const velocityFeedbackRouteLeft = createRoutePin('Vel Feedback L', { x: 180, y: 340 });
	const qReferenceRouteRight = createRoutePin('Iq Ref R', { x: 1480, y: 640 });
	const qReferenceRouteLeft = createRoutePin('Iq Ref L', { x: 180, y: 640 });
	const dFeedbackRouteRight = createRoutePin('Id Feedback R', { x: 1480, y: 560 });
	const dFeedbackRouteLeft = createRoutePin('Id Feedback L', { x: 180, y: 560 });
	const qFeedbackRouteRight = createRoutePin('Iq Feedback R', { x: 1480, y: 760 });
	const qFeedbackRouteLeft = createRoutePin('Iq Feedback L', { x: 180, y: 760 });

	if (
		!positionReference ||
		!positionError ||
		!positionKp ||
		!positionKi ||
		!positionIntegrator ||
		!positionControl ||
		!positionClamp ||
		!velocityError ||
		!velocityKp ||
		!velocityKi ||
		!velocityIntegrator ||
		!velocityControl ||
		!velocityClamp ||
		!directAxisReference ||
		!directAxisError ||
		!directAxisKp ||
		!directAxisKi ||
		!directAxisIntegrator ||
		!directAxisControl ||
		!directAxisClamp ||
		!torqueAxisError ||
		!torqueAxisKp ||
		!torqueAxisKi ||
		!torqueAxisIntegrator ||
		!torqueAxisControl ||
		!torqueAxisClamp ||
		!inversePark ||
		!inverseClarke ||
		!motor ||
		!encoder ||
		!clarke ||
		!park ||
		!frictionGain ||
		!accelerationGain ||
		!loadSum ||
		!positionFeedbackRouteRight ||
		!positionFeedbackRouteLeft ||
		!velocityReferenceRouteRight ||
		!velocityReferenceRouteLeft ||
		!velocityFeedbackRouteRight ||
		!velocityFeedbackRouteLeft ||
		!qReferenceRouteRight ||
		!qReferenceRouteLeft ||
		!dFeedbackRouteRight ||
		!dFeedbackRouteLeft ||
		!qFeedbackRouteRight ||
		!qFeedbackRouteLeft
	) {
		return project;
	}

	positionReference.label = 'Position Ref';
	positionError.label = 'Position Error';
	positionKp.label = 'Position Kp';
	positionKi.label = 'Position Ki';
	positionIntegrator.label = 'Position Integral';
	positionControl.label = 'Position PI Sum';
	positionClamp.label = 'Velocity Ref Clamp';

	velocityError.label = 'Velocity Error';
	velocityKp.label = 'Velocity Kp';
	velocityKi.label = 'Velocity Ki';
	velocityIntegrator.label = 'Velocity Integral';
	velocityControl.label = 'Velocity PI Sum';
	velocityClamp.label = 'Iq Ref Clamp';

	directAxisReference.label = 'Id Ref';
	directAxisError.label = 'Id Error';
	directAxisKp.label = 'Id Kp';
	directAxisKi.label = 'Id Ki';
	directAxisIntegrator.label = 'Id Integral';
	directAxisControl.label = 'Id PI Sum';
	directAxisClamp.label = 'Id Clamp';

	torqueAxisError.label = 'Iq Error';
	torqueAxisKp.label = 'Iq Kp';
	torqueAxisKi.label = 'Iq Ki';
	torqueAxisIntegrator.label = 'Iq Integral';
	torqueAxisControl.label = 'Iq PI Sum';
	torqueAxisClamp.label = 'Iq Clamp';

	inversePark.label = 'Inverse Park';
	inverseClarke.label = 'Inverse Clarke';
	motor.label = 'Linear BLDC Plant';
	encoder.label = 'Encoder';
	clarke.label = 'Clarke';
	park.label = 'Park';
	frictionGain.label = 'Friction Torque';
	accelerationGain.label = 'Mass Torque';
	loadSum.label = 'Load Sum';

	positionReference.parameters.initialValue = 0;
	positionReference.parameters.finalValue = 0.18;
	positionReference.parameters.stepTime = 0.4;
	positionError.parameters.operation = 'subtract';
	positionKp.parameters.gain = 8;
	positionKi.parameters.gain = 1.2;
	positionControl.parameters.operation = 'add';
	positionClamp.parameters.min = -2.5;
	positionClamp.parameters.max = 2.5;

	velocityError.parameters.operation = 'subtract';
	velocityKp.parameters.gain = 0.9;
	velocityKi.parameters.gain = 2.5;
	velocityControl.parameters.operation = 'add';
	velocityClamp.parameters.min = -1.8;
	velocityClamp.parameters.max = 1.8;

	directAxisReference.parameters.initialValue = 0;
	directAxisReference.parameters.finalValue = 0;
	directAxisReference.parameters.stepTime = 0;
	directAxisError.parameters.operation = 'subtract';
	directAxisKp.parameters.gain = 0.18;
	directAxisKi.parameters.gain = 6;
	directAxisControl.parameters.operation = 'add';
	directAxisClamp.parameters.min = -1;
	directAxisClamp.parameters.max = 1;

	torqueAxisError.parameters.operation = 'subtract';
	torqueAxisKp.parameters.gain = 0.24;
	torqueAxisKi.parameters.gain = 9;
	torqueAxisControl.parameters.operation = 'add';
	torqueAxisClamp.parameters.min = -1;
	torqueAxisClamp.parameters.max = 1;

	motor.parameters.polePairs = 4;
	motor.parameters.kv = 120;
	motor.parameters.coggingTorque = 0.01;
	motor.parameters.currentPerUnit = 6;
	motor.parameters.electricalTimeConstant = 0.01;
	motor.parameters.inertia = 0.02;
	motor.parameters.viscousDamping = 0.08;
	motor.parameters.coulombFriction = 0.02;
	motor.parameters.constantLoadTorque = 0.04;
	encoder.parameters.countsPerUnit = 2048;
	encoder.parameters.samplePeriod = 0.001;
	encoder.parameters.polePairs = 4;
	frictionGain.parameters.gain = 0.12;
	accelerationGain.parameters.gain = 0.01;
	loadSum.parameters.operation = 'add';

	project.nodes = [
		positionReference,
		positionError,
		positionKp,
		positionKi,
		positionIntegrator,
		positionControl,
		positionClamp,
		velocityError,
		velocityKp,
		velocityKi,
		velocityIntegrator,
		velocityControl,
		velocityClamp,
		directAxisReference,
		directAxisError,
		directAxisKp,
		directAxisKi,
		directAxisIntegrator,
		directAxisControl,
		directAxisClamp,
		torqueAxisError,
		torqueAxisKp,
		torqueAxisKi,
		torqueAxisIntegrator,
		torqueAxisControl,
		torqueAxisClamp,
		inversePark,
		inverseClarke,
		motor,
		encoder,
		clarke,
		park,
		frictionGain,
		accelerationGain,
		loadSum,
		positionFeedbackRouteRight,
		positionFeedbackRouteLeft,
		velocityReferenceRouteRight,
		velocityReferenceRouteLeft,
		velocityFeedbackRouteRight,
		velocityFeedbackRouteLeft,
		qReferenceRouteRight,
		qReferenceRouteLeft,
		dFeedbackRouteRight,
		dFeedbackRouteLeft,
		qFeedbackRouteRight,
		qFeedbackRouteLeft
	];

	project.edges = [
		connect(positionReference, 'out', positionError, 'a', 'pos_ref'),
		connect(positionError, 'out', positionKp, 'in', 'pos_err_p'),
		connect(positionError, 'out', positionKi, 'in', 'pos_err_i'),
		connect(positionKi, 'out', positionIntegrator, 'in', 'pos_int_rate'),
		connect(positionKp, 'out', positionControl, 'a', 'pos_p'),
		connect(positionIntegrator, 'out', positionControl, 'b', 'pos_i'),
		connect(positionControl, 'out', positionClamp, 'in', 'vel_ref_raw'),

		connect(positionClamp, 'out', velocityReferenceRouteRight, 'in', 'vel_ref_bus_r'),
		connect(velocityReferenceRouteRight, 'out', velocityReferenceRouteLeft, 'in', 'vel_ref_bus'),
		connect(velocityReferenceRouteLeft, 'out', velocityError, 'a', 'vel_ref'),

		connect(velocityError, 'out', velocityKp, 'in', 'vel_err_p'),
		connect(velocityError, 'out', velocityKi, 'in', 'vel_err_i'),
		connect(velocityKi, 'out', velocityIntegrator, 'in', 'vel_int_rate'),
		connect(velocityKp, 'out', velocityControl, 'a', 'vel_p'),
		connect(velocityIntegrator, 'out', velocityControl, 'b', 'vel_i'),
		connect(velocityControl, 'out', velocityClamp, 'in', 'iq_ref_raw'),

		connect(velocityClamp, 'out', qReferenceRouteRight, 'in', 'iq_ref_bus_r'),
		connect(qReferenceRouteRight, 'out', qReferenceRouteLeft, 'in', 'iq_ref_bus'),
		connect(qReferenceRouteLeft, 'out', torqueAxisError, 'a', 'iq_ref'),

		connect(directAxisReference, 'out', directAxisError, 'a', 'id_ref'),
		connect(directAxisError, 'out', directAxisKp, 'in', 'id_err_p'),
		connect(directAxisError, 'out', directAxisKi, 'in', 'id_err_i'),
		connect(directAxisKi, 'out', directAxisIntegrator, 'in', 'id_int_rate'),
		connect(directAxisKp, 'out', directAxisControl, 'a', 'id_p'),
		connect(directAxisIntegrator, 'out', directAxisControl, 'b', 'id_i'),
		connect(directAxisControl, 'out', directAxisClamp, 'in', 'id_cmd'),

		connect(torqueAxisError, 'out', torqueAxisKp, 'in', 'iq_err_p'),
		connect(torqueAxisError, 'out', torqueAxisKi, 'in', 'iq_err_i'),
		connect(torqueAxisKi, 'out', torqueAxisIntegrator, 'in', 'iq_int_rate'),
		connect(torqueAxisKp, 'out', torqueAxisControl, 'a', 'iq_p'),
		connect(torqueAxisIntegrator, 'out', torqueAxisControl, 'b', 'iq_i'),
		connect(torqueAxisControl, 'out', torqueAxisClamp, 'in', 'iq_cmd'),

		connect(directAxisClamp, 'out', inversePark, 'd', 'vd_cmd'),
		connect(torqueAxisClamp, 'out', inversePark, 'q', 'vq_cmd'),
		connect(encoder, 'thetaE', inversePark, 'theta', 'theta_e_inv'),
		connect(encoder, 'thetaE', park, 'theta', 'theta_e_fwd'),
		connect(inversePark, 'alpha', inverseClarke, 'alpha', 'alpha_cmd'),
		connect(inversePark, 'beta', inverseClarke, 'beta', 'beta_cmd'),
		connect(inverseClarke, 'u', motor, 'uEffort', 'u_effort'),
		connect(inverseClarke, 'v', motor, 'vEffort', 'v_effort'),
		connect(inverseClarke, 'w', motor, 'wEffort', 'w_effort'),

		connect(motor, 'iU', clarke, 'u', 'iu'),
		connect(motor, 'iV', clarke, 'v', 'iv'),
		connect(motor, 'iW', clarke, 'w', 'iw'),
		connect(clarke, 'alpha', park, 'alpha', 'alpha_fb'),
		connect(clarke, 'beta', park, 'beta', 'beta_fb'),

		connect(park, 'd', dFeedbackRouteRight, 'in', 'id_fb_r'),
		connect(dFeedbackRouteRight, 'out', dFeedbackRouteLeft, 'in', 'id_fb_bus'),
		connect(dFeedbackRouteLeft, 'out', directAxisError, 'b', 'id_meas'),

		connect(park, 'q', qFeedbackRouteRight, 'in', 'iq_fb_r'),
		connect(qFeedbackRouteRight, 'out', qFeedbackRouteLeft, 'in', 'iq_fb_bus'),
		connect(qFeedbackRouteLeft, 'out', torqueAxisError, 'b', 'iq_meas'),

		connect(motor, 'pos', encoder, 'pos', 'pos'),
		connect(motor, 'vel', encoder, 'vel', 'vel'),

		connect(encoder, 'pos', positionFeedbackRouteRight, 'in', 'pos_fb_r'),
		connect(positionFeedbackRouteRight, 'out', positionFeedbackRouteLeft, 'in', 'pos_fb_bus'),
		connect(positionFeedbackRouteLeft, 'out', positionError, 'b', 'pos_meas'),

		connect(encoder, 'vel', velocityFeedbackRouteRight, 'in', 'vel_fb_r'),
		connect(velocityFeedbackRouteRight, 'out', velocityFeedbackRouteLeft, 'in', 'vel_fb_bus'),
		connect(velocityFeedbackRouteLeft, 'out', velocityError, 'b', 'vel_meas'),

		connect(motor, 'vel', frictionGain, 'in', 'friction'),
		connect(motor, 'accel', accelerationGain, 'in', 'mass'),
		connect(frictionGain, 'out', loadSum, 'a', 'viscous'),
		connect(accelerationGain, 'out', loadSum, 'b', 'inertial'),
		connect(loadSum, 'out', motor, 'loadTorque', 'load')
	];

	const positionOutput = createOutputDefinition(project, {
		nodeId: motor.id,
		portId: 'pos',
		label: 'Motor Position'
	});
	positionOutput.kind = 'plot';
	positionOutput.color = '#00a7d6';
	project.outputs.push(positionOutput);

	const velocityOutput = createOutputDefinition(project, {
		nodeId: motor.id,
		portId: 'vel',
		label: 'Motor Velocity'
	});
	velocityOutput.kind = 'plot';
	velocityOutput.color = '#6ab77b';
	project.outputs.push(velocityOutput);

	const qCurrentOutput = createOutputDefinition(project, {
		nodeId: park.id,
		portId: 'q',
		label: 'Q-Axis Current'
	});
	qCurrentOutput.kind = 'plot';
	qCurrentOutput.color = '#f19143';
	project.outputs.push(qCurrentOutput);

	const dCurrentOutput = createOutputDefinition(project, {
		nodeId: park.id,
		portId: 'd',
		label: 'D-Axis Current'
	});
	dCurrentOutput.kind = 'plot';
	dCurrentOutput.color = '#7860d5';
	project.outputs.push(dCurrentOutput);

	const countsOutput = createOutputDefinition(project, {
		nodeId: encoder.id,
		portId: 'counts',
		label: 'Encoder Counts'
	});
	countsOutput.kind = 'value';
	project.outputs.push(countsOutput);

	return project;
}