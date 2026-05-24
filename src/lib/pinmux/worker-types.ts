import type {
	McuDefinitionDocument,
	PinOverrideMode,
	PinmuxProjectDocument
} from '$lib/pinmux/model';

export type PinmuxDiagnosticLevel = 'info' | 'warning' | 'error';

export interface PinmuxDiagnostic {
	id: string;
	level: PinmuxDiagnosticLevel;
	message: string;
	peripheralId?: string;
	pinId?: string;
}

export interface ResolvedSignalAssignment {
	peripheralId: string;
	signalId: string;
	pinId: string;
	af: string | null;
	routingOptionId: string | null;
}

export interface ResolvedSignalRoutingState {
	signalId: string;
	activeRoutingOptionId: string | null;
	availableRoutingOptionIds: string[];
	impossibleRoutingOptionIds: string[];
}

export interface ResolvedPinState {
	pinId: string;
	ownerKind: 'free' | 'override' | 'signal';
	peripheralId: string | null;
	signalId: string | null;
	overrideMode: PinOverrideMode;
	af: string | null;
	routingOptionId: string | null;
}

export interface ResolvedPeripheralState {
	peripheralId: string;
	enabled: boolean;
	canEnable: boolean;
	disabledReason: string | null;
	activeRoutingOptionId: string | null;
	availableRoutingOptionIds: string[];
	impossibleRoutingOptionIds: string[];
	availableSignalIds: string[];
	impossibleSignalIds: string[];
	signalRoutingStates: ResolvedSignalRoutingState[];
}

export interface PinmuxSolution {
	assignments: ResolvedSignalAssignment[];
	pinStates: ResolvedPinState[];
	peripheralStates: ResolvedPeripheralState[];
}

export interface PinmuxSolveRequest {
	requestId: string;
	definition: McuDefinitionDocument | null;
	project: PinmuxProjectDocument;
}

export interface PinmuxSolveSuccess {
	requestId: string;
	ok: true;
	diagnostics: PinmuxDiagnostic[];
	message: null;
	solution: PinmuxSolution;
}

export interface PinmuxSolveFailure {
	requestId: string;
	ok: false;
	diagnostics: PinmuxDiagnostic[];
	message: string;
	solution: PinmuxSolution;
}

export type PinmuxSolveResponse = PinmuxSolveSuccess | PinmuxSolveFailure;