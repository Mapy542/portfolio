<script lang="ts">
	import {
		Background,
		BackgroundVariant,
		Controls,
		MiniMap,
		SvelteFlow,
		type Connection,
		type Viewport,
		type XYPosition
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import { onDestroy, onMount, tick } from 'svelte';
	import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

	import TransferActionPill from '$lib/components/pinmux/TransferActionPill.svelte';
	import BlockNode from '$lib/components/signal-sim/BlockNode.svelte';
	import SignalPlot from '$lib/components/signal-sim/SignalPlot.svelte';
	import {
		describePort,
		isConnectionCompatible,
		toFlowEdges,
		toFlowNodes
	} from '$lib/signal-sim/flow';
	import {
		parseProjectDocumentJson,
		serializeProjectDocument,
		type BlockParameterDefinition
	} from '$lib/signal-sim/model';
	import { getBlockDefinition } from '$lib/signal-sim/registry';
	import { createSignalSimEditorStore, type SignalOption } from '$lib/signal-sim/stores';
	import { createSignalKey } from '$lib/signal-sim/worker-types';

	const {
		project,
		selection,
		currentTime,
		playing,
		runState,
		needsRun,
		simulationResult,
		simulationSummary,
		simulationErrorMessage,
		currentSignalValues,
		selectedNode,
		selectedEdge,
		availableSignals,
		validationMessages,
		graphStats,
		blockCatalog,
		addBlock,
		addConnection,
		syncNodePositions,
		removeElementsById,
		removeSelection,
		updateNodeLabel,
		updateNodeParameter,
		updateEdgeLabel,
		updateSimulationConfig,
		addOutput,
		updateOutput,
		removeOutput,
		replaceProjectDocument,
		clearProject,
		resetProject,
		runSimulation,
		setSelection,
		setCurrentTime,
		setPlaying,
		setProjectName,
		destroy
	} = createSignalSimEditorStore();

	const nodeTypes = { signalBlock: BlockNode };

	let flowNodes = toFlowNodes([]);
	let flowEdges = toFlowEdges([]);
	let flowViewport: Viewport = { x: 0, y: 0, zoom: 1 };
	let flowShell: HTMLDivElement | null = null;
	let fileInput: HTMLInputElement | null = null;
	let csvFileInput: HTMLInputElement | null = null;
	let blockFilter = '';
	let paletteCollapsed = false;
	let inspectorCollapsed = false;
	let loadError = '';
	let shareStatus = '';
	let shareDialogOpen = false;
	let shareDialogUrl = '';
	let shareDialogStatus = '';
	let shareDialogField: HTMLTextAreaElement | null = null;
	let pendingCsvImportTarget: { nodeId: string; parameterKey: string } | null = null;
	let animationFrame = 0;
	let lastAnimationTimestamp = 0;
	let autoRunTimeout: ReturnType<typeof setTimeout> | null = null;

	const AUTO_RUN_DELAY_MS = 1000;
	const MIN_SIMULATION_TIME_SECONDS = 0.000001;
	const MIN_PLAYBACK_RATE = 0.1;
	const FLOW_SNAP_GRID = 24;
	const NEW_NODE_GRID_STEP = { x: 288, y: 192 };
	const NEW_NODE_VIEW_MARGIN = { x: 48, y: 48 };
	const NEW_NODE_FOOTPRINT = { width: 240, height: 160 };
	const NEW_NODE_MIN_SEPARATION = 132;

	$: flowNodes = toFlowNodes($project.nodes, $selection?.kind === 'node' ? $selection.id : null);
	$: flowEdges = toFlowEdges($project.edges, $selection?.kind === 'edge' ? $selection.id : null);
	$: selectedDefinition = $selectedNode ? getBlockDefinition($selectedNode.blockType) : null;
	$: simulationSeriesByKey = new Map(
		($simulationResult?.series ?? []).map((series) => [series.key, series])
	);
	$: filteredCatalog = blockCatalog
		.map((group) => ({
			...group,
			blocks: group.blocks.filter((block) => {
				const needle = blockFilter.trim().toLowerCase();
				if (!needle) {
					return true;
				}

				return [block.title, block.description, ...block.tags]
					.join(' ')
					.toLowerCase()
					.includes(needle);
			})
		}))
		.filter((group) => group.blocks.length > 0);

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function decodeLegacyProjectFromUri(value: string): string {
		const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
		const paddingLength = (4 - (normalized.length % 4 || 4)) % 4;
		const decodedBinary = atob(`${normalized}${'='.repeat(paddingLength)}`);
		const decodedBytes = Uint8Array.from(decodedBinary, (character) => character.charCodeAt(0));
		return new TextDecoder().decode(decodedBytes);
	}

	function encodeProjectForUri(value: string): string {
		return `lz:${compressToEncodedURIComponent(value)}`;
	}

	function decodeProjectFromUri(value: string): string {
		if (value.startsWith('lz:')) {
			const decoded = decompressFromEncodedURIComponent(value.slice(3));

			if (decoded === null) {
				throw new Error('The shared project URL is invalid or truncated.');
			}

			return decoded;
		}

		return decodeLegacyProjectFromUri(value);
	}

	function getEncodedProjectFromUri(): string | null {
		const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
		return hashParams.get('project');
	}

	function buildProjectUri(encodedProject: string): string {
		const shareUrl = new URL(window.location.href);
		const hashParams = new URLSearchParams(shareUrl.hash.replace(/^#/, ''));
		hashParams.set('project', encodedProject);
		shareUrl.hash = hashParams.toString();
		return shareUrl.toString();
	}

	function formatTime(value: number): string {
		return value.toFixed(4);
	}

	function formatRunState(state: string): string {
		switch (state) {
			case 'editor-foundation':
				return 'Editor ready, no cached run yet';
			case 'stale':
				return 'Project changed, rerun required';
			case 'compiling':
				return 'Compiling and simulating';
			case 'ready':
				return 'Cached run ready for playback';
			case 'error':
				return 'Simulation failed';
			default:
				return state;
		}
	}

	function snapToFlowGrid(value: number): number {
		return Math.round(value / FLOW_SNAP_GRID) * FLOW_SNAP_GRID;
	}

	function getViewportPlacementCandidates(): XYPosition[] {
		if (!flowShell) {
			return [];
		}

		const bounds = flowShell.getBoundingClientRect();

		if (bounds.width <= 0 || bounds.height <= 0) {
			return [];
		}

		const zoom = flowViewport.zoom || 1;
		const visibleLeft = -flowViewport.x / zoom;
		const visibleTop = -flowViewport.y / zoom;
		const visibleRight = visibleLeft + bounds.width / zoom;
		const visibleBottom = visibleTop + bounds.height / zoom;
		const minX = snapToFlowGrid(visibleLeft + NEW_NODE_VIEW_MARGIN.x);
		const minY = snapToFlowGrid(visibleTop + NEW_NODE_VIEW_MARGIN.y);
		const maxX = snapToFlowGrid(
			Math.max(minX, visibleRight - NEW_NODE_FOOTPRINT.width - NEW_NODE_VIEW_MARGIN.x)
		);
		const maxY = snapToFlowGrid(
			Math.max(minY, visibleBottom - NEW_NODE_FOOTPRINT.height - NEW_NODE_VIEW_MARGIN.y)
		);
		const candidates: XYPosition[] = [];

		for (let y = minY; y <= maxY; y += NEW_NODE_GRID_STEP.y) {
			for (let x = minX; x <= maxX; x += NEW_NODE_GRID_STEP.x) {
				candidates.push({ x, y });
			}
		}

		if (candidates.length > 0) {
			return candidates;
		}

		return [{ x: minX, y: minY }];
	}

	function getNearestNodeDistance(candidate: XYPosition): number {
		const nodePositions = $project.nodes.map((node) => node.position);

		if (nodePositions.length === 0) {
			return Number.POSITIVE_INFINITY;
		}

		return nodePositions.reduce(
			(nearestDistance, position) =>
				Math.min(nearestDistance, Math.hypot(position.x - candidate.x, position.y - candidate.y)),
			Number.POSITIVE_INFINITY
		);
	}

	function getNextViewportNodePosition(): XYPosition | undefined {
		const candidates = getViewportPlacementCandidates();

		if (candidates.length === 0) {
			return undefined;
		}

		let fallbackCandidate = candidates[0];
		let fallbackDistance = Number.NEGATIVE_INFINITY;

		for (const candidate of candidates) {
			const nearestDistance = getNearestNodeDistance(candidate);

			if (nearestDistance >= NEW_NODE_MIN_SEPARATION) {
				return candidate;
			}

			if (nearestDistance > fallbackDistance) {
				fallbackCandidate = candidate;
				fallbackDistance = nearestDistance;
			}
		}

		return fallbackCandidate;
	}

	function addBlockInViewport(blockType: string) {
		addBlock(blockType, getNextViewportNodePosition());
	}

	async function togglePlayback() {
		if ($playing) {
			setPlaying(false);
			return;
		}

		const readyToPlay = await runSimulation();
		if (!readyToPlay) {
			return;
		}

		const playbackDuration = $simulationSummary?.duration ?? $project.simulation.duration;

		if ($currentTime >= playbackDuration) {
			setCurrentTime(0);
		}

		setPlaying(true);
	}

	function cancelPlayback() {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
			animationFrame = 0;
		}

		lastAnimationTimestamp = 0;
	}

	function stepPlayback(timestamp: number) {
		if (!$playing) {
			cancelPlayback();
			return;
		}

		if (!lastAnimationTimestamp) {
			lastAnimationTimestamp = timestamp;
		}

		const deltaSeconds = (timestamp - lastAnimationTimestamp) / 1000;
		lastAnimationTimestamp = timestamp;

		const nextTime = $currentTime + deltaSeconds * $project.simulation.playbackRate;

		if (nextTime >= $project.simulation.duration) {
			setCurrentTime($project.simulation.duration);
			setPlaying(false);
			cancelPlayback();
			return;
		}

		setCurrentTime(nextTime);
		animationFrame = requestAnimationFrame(stepPlayback);
	}

	$: {
		if ($playing) {
			if (!animationFrame) {
				animationFrame = requestAnimationFrame(stepPlayback);
			}
		} else {
			cancelPlayback();
		}
	}

	function cancelAutoRun() {
		if (autoRunTimeout !== null) {
			clearTimeout(autoRunTimeout);
			autoRunTimeout = null;
		}
	}

	async function runSimulationSoon(projectStamp: string) {
		autoRunTimeout = null;

		if ($project.meta.updatedAt !== projectStamp || !$needsRun || $runState === 'compiling') {
			return;
		}

		setPlaying(false);
		await runSimulation(true);
	}

	$: if (typeof window !== 'undefined') {
		const projectStamp = $project.meta.updatedAt;
		cancelAutoRun();

		if ($needsRun && $runState !== 'compiling') {
			autoRunTimeout = setTimeout(() => {
				void runSimulationSoon(projectStamp);
			}, AUTO_RUN_DELAY_MS);
		}
	}

	function rerunSimulation() {
		setPlaying(false);
		void runSimulation(true);
	}

	function clearWorkspace() {
		if (
			typeof window !== 'undefined' &&
			!window.confirm(
				'Clear the current workspace? This removes all blocks, wires, and outputs but keeps the project name and run settings.'
			)
		) {
			return;
		}

		clearProject();
		loadError = '';
		shareStatus = '';
		closeShareProjectDialog();
	}

	onDestroy(() => {
		cancelPlayback();
		cancelAutoRun();
		destroy();
	});

	onMount(() => {
		loadProjectFromUri({ quietIfMissing: true });
	});

	function updateSimulationField(
		field: 'duration' | 'stepSize' | 'playbackRate' | 'sampleDecimation',
		event: Event
	) {
		const nextValue = Number((event.currentTarget as HTMLInputElement).value);

		if (!Number.isFinite(nextValue)) {
			return;
		}

		if (field === 'sampleDecimation') {
			updateSimulationConfig({ sampleDecimation: Math.max(1, Math.round(nextValue)) });
			return;
		}

		const minimumValue = field === 'playbackRate' ? MIN_PLAYBACK_RATE : MIN_SIMULATION_TIME_SECONDS;

		updateSimulationConfig({ [field]: Math.max(minimumValue, nextValue) });
	}

	function updateParameterField(definition: BlockParameterDefinition, event: Event) {
		if (!$selectedNode) {
			return;
		}

		const target = event.currentTarget as
			| HTMLInputElement
			| HTMLSelectElement
			| HTMLTextAreaElement;
		let nextValue: string | number | boolean | null = target.value;

		switch (definition.kind) {
			case 'number': {
				const numericValue = Number(target.value);
				if (!Number.isFinite(numericValue)) {
					return;
				}
				nextValue = numericValue;
				break;
			}
			case 'boolean':
				nextValue = (target as HTMLInputElement).checked;
				break;
			default:
				nextValue = target.value;
		}

		updateNodeParameter($selectedNode.id, definition.key, nextValue);
	}

	function handleConnect(connection: Connection) {
		addConnection(connection);
	}

	function validateConnection(candidate: Connection | { id: string }) {
		if ('id' in candidate) {
			return false;
		}

		return isConnectionCompatible(
			{
				...candidate,
				sourceHandle: candidate.sourceHandle ?? null,
				targetHandle: candidate.targetHandle ?? null
			},
			flowNodes,
			flowEdges
		);
	}

	function handleNodeDragStop({
		nodes
	}: {
		nodes: Array<{ id: string; position: { x: number; y: number } }>;
	}) {
		syncNodePositions(nodes);
	}

	function handleDelete({
		nodes,
		edges
	}: {
		nodes: Array<{ id: string }>;
		edges: Array<{ id: string }>;
	}) {
		removeElementsById(
			nodes.map((node) => node.id),
			edges.map((edge) => edge.id)
		);
	}

	function handleSelectionChange({
		nodes,
		edges
	}: {
		nodes: Array<{ id: string }>;
		edges: Array<{ id: string }>;
	}) {
		if (nodes.length === 1 && edges.length === 0) {
			setSelection({ kind: 'node', id: nodes[0].id });
			return;
		}

		if (edges.length === 1 && nodes.length === 0) {
			setSelection({ kind: 'edge', id: edges[0].id });
			return;
		}
	}

	function jumpToStart() {
		setPlaying(false);
		setCurrentTime(0);
	}

	function exportProjectFile() {
		const fileName = `${slugify($project.meta.name || 'signal-sim')}.signal-sim.json`;
		const blob = new Blob([serializeProjectDocument($project)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
	}

	function loadProjectFromUri(options: { quietIfMissing?: boolean } = {}): boolean {
		const encodedProject = getEncodedProjectFromUri();

		if (!encodedProject) {
			if (!options.quietIfMissing) {
				loadError = 'No shared simulator project was found in the current URL.';
			}
			shareStatus = '';
			return false;
		}

		try {
			replaceProjectDocument(parseProjectDocumentJson(decodeProjectFromUri(encodedProject)));
			loadError = '';
			shareDialogOpen = false;
			shareDialogStatus = '';
			shareStatus = 'Loaded project from shared link.';
			return true;
		} catch (error) {
			loadError =
				error instanceof Error
					? error.message
					: 'The project embedded in this URL could not be decoded.';
			shareStatus = '';
			return false;
		}
	}

	function closeShareProjectDialog() {
		shareDialogOpen = false;
		shareDialogStatus = '';
	}

	async function openShareProjectDialog() {
		try {
			const encodedProject = encodeProjectForUri(serializeProjectDocument($project));
			shareDialogUrl = buildProjectUri(encodedProject);
			shareDialogStatus =
				shareDialogUrl.length > 12000
					? 'This compressed URL is still large and may exceed some browser limits.'
					: 'This compressed URL is ready to copy.';
			shareDialogOpen = true;
			loadError = '';
			await tick();
			shareDialogField?.focus();
			shareDialogField?.select();
		} catch (error) {
			loadError =
				error instanceof Error
					? error.message
					: 'Unable to encode this project into a shareable URL.';
			shareDialogOpen = false;
			shareDialogStatus = '';
		}
	}

	async function copyShareProjectUrl() {
		if (!shareDialogUrl) {
			return;
		}

		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(shareDialogUrl);
				shareDialogStatus = 'Share URL copied to clipboard.';
				return;
			} catch {
				// Fall back to selecting the text for manual copy.
			}
		}

		shareDialogField?.focus();
		shareDialogField?.select();
		shareDialogStatus = 'Press Ctrl+C to copy the selected URL.';
	}

	function handleShareDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeShareProjectDialog();
		}
	}

	async function importProjectFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		try {
			replaceProjectDocument(parseProjectDocumentJson(await file.text()));
			loadError = '';
			shareStatus = '';
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Unable to load this project file.';
			shareStatus = '';
		}

		input.value = '';
	}

	async function importCsvParameterFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file || !pendingCsvImportTarget) {
			input.value = '';
			return;
		}

		updateNodeParameter(
			pendingCsvImportTarget.nodeId,
			pendingCsvImportTarget.parameterKey,
			await file.text()
		);
		pendingCsvImportTarget = null;
		input.value = '';
	}

	function openCsvParameterImport(parameterKey: string) {
		if (!$selectedNode) {
			return;
		}

		pendingCsvImportTarget = {
			nodeId: $selectedNode.id,
			parameterKey
		};
		csvFileInput?.click();
	}

	function selectSignalOption(output: { id: string }, event: Event) {
		const nextValue = (event.currentTarget as HTMLSelectElement).value;

		if (!nextValue) {
			updateOutput(output.id, { sourceNodeId: null, sourcePortId: null });
			return;
		}

		const [nodeId, portId] = nextValue.split(':');
		updateOutput(output.id, {
			sourceNodeId: nodeId ?? null,
			sourcePortId: portId ?? null
		});
	}

	function getSignalSelectionValue(output: {
		sourceNodeId: string | null;
		sourcePortId: string | null;
	}): string {
		if (!output.sourceNodeId || !output.sourcePortId) {
			return '';
		}

		return `${output.sourceNodeId}:${output.sourcePortId}`;
	}

	function addOutputFromSelection() {
		if ($selectedNode) {
			const definition = getBlockDefinition($selectedNode.blockType);
			const firstOutput = definition?.outputs[0];
			addOutput(
				firstOutput
					? {
							nodeId: $selectedNode.id,
							portId: firstOutput.id,
							label: `${$selectedNode.label} ${firstOutput.label}`
						}
					: undefined
			);
			return;
		}

		addOutput();
	}

	function renderSignalOption(option: SignalOption): string {
		return `${option.nodeLabel} - ${option.portLabel} (${option.signalKind}, ${option.timingMode})`;
	}

	function formatSignalValue(value: number | undefined) {
		if (value === undefined || Number.isNaN(value)) {
			return '--';
		}

		if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
			return value.toExponential(3);
		}

		return value.toFixed(5);
	}
</script>

<svelte:head>
	<title>Signal Simulator</title>
	<meta
		name="description"
		content="Editable signal and systems workspace scaffold with a flow editor, transport controls, and output configuration."
	/>
</svelte:head>

<input
	bind:this={fileInput}
	type="file"
	accept="application/json"
	class="sr-only"
	onchange={importProjectFile}
/>

<input
	bind:this={csvFileInput}
	type="file"
	accept=".csv,text/csv"
	class="sr-only"
	onchange={importCsvParameterFile}
/>

{#if shareDialogOpen}
	<div class="share-dialog-backdrop" role="presentation" onclick={closeShareProjectDialog}>
		<div
			class="share-dialog panel-card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-project-title"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={handleShareDialogKeydown}
		>
			<div class="panel-header">
				<div>
					<p class="eyebrow">Share</p>
					<h2 id="share-project-title">Share project as URL</h2>
				</div>
				<button type="button" class="ghost-button" onclick={closeShareProjectDialog}>Close</button>
			</div>

			<p class="share-dialog__copy">
				This link includes the current project state in a compressed URL without changing the
				address bar of your current page.
			</p>

			<textarea
				bind:this={shareDialogField}
				class="share-dialog__field"
				readonly
				spellcheck="false"
				value={shareDialogUrl}
			></textarea>

			{#if shareDialogStatus}
				<p class="share-dialog__status">{shareDialogStatus}</p>
			{/if}

			<div class="share-dialog__actions">
				<button
					type="button"
					class="action-button action-button--primary"
					onclick={copyShareProjectUrl}
				>
					Copy URL
				</button>
				<button type="button" class="action-button" onclick={closeShareProjectDialog}>Done</button>
			</div>
		</div>
	</div>
{/if}

<section class="signal-sim-route">
	<header class="hero-card panel-card">
		<div class="hero-card__copy">
			<p class="eyebrow">Signal & Systems Sandbox</p>
			<h1>{$project.meta.name}</h1>
			<div class="hero-summary">
				<span>Continous & Descrete Elements</span>
				<span>Control Loop Testing</span>
				<span>Plot and value outputs</span>
			</div>
		</div>

		<div class="hero-sidecar">
			<div class="hero-actions">
				<TransferActionPill
					groupLabel="Signal simulator JSON actions"
					formatLabel="JSON"
					importLabel="Load project JSON"
					exportLabel="Save project JSON"
					onImport={() => fileInput?.click()}
					onExport={exportProjectFile}
				/>
				<button type="button" class="action-button" onclick={openShareProjectDialog}>
					Share project as URL
				</button>
				<button type="button" class="action-button" onclick={resetProject}>Reset Demo</button>
			</div>

			{#if shareStatus}
				<p class="hero-share-status">{shareStatus}</p>
			{/if}
		</div>
	</header>

	<div
		class="workspace-grid"
		class:workspace-grid--palette-collapsed={paletteCollapsed}
		class:workspace-grid--inspector-collapsed={inspectorCollapsed}
	>
		<aside class="panel-card palette-panel" class:sidebar-panel--collapsed={paletteCollapsed}>
			<div class="sidebar-panel__top">
				<div class="panel-header panel-header--sidebar">
					<div class="sidebar-title">
						<p class="eyebrow">Palette</p>
						<h2>{paletteCollapsed ? 'Blocks' : 'Signal Blocks'}</h2>
					</div>
					<button
						type="button"
						class="collapse-button"
						aria-expanded={!paletteCollapsed}
						aria-label={paletteCollapsed ? 'Expand palette sidebar' : 'Collapse palette sidebar'}
						onclick={() => (paletteCollapsed = !paletteCollapsed)}
					>
						{paletteCollapsed ? 'Show' : 'Hide'}
					</button>
				</div>

				{#if !paletteCollapsed}
					<input
						type="search"
						placeholder="Filter blocks"
						value={blockFilter}
						oninput={(event) => (blockFilter = (event.currentTarget as HTMLInputElement).value)}
					/>
				{/if}
			</div>

			{#if !paletteCollapsed}
				<div class="palette-groups">
					{#each filteredCatalog as group}
						<section class="palette-group">
							<header>
								<h3>{group.category}</h3>
								<span>{group.blocks.length}</span>
							</header>

							<div class="palette-cards">
								{#each group.blocks as block}
									<button
										class="palette-card"
										type="button"
										onclick={() => addBlockInViewport(block.type)}
									>
										<div class="palette-card__top">
											<strong>{block.title}</strong>
											<span>{block.shortLabel}</span>
										</div>
										<p>{block.description}</p>
										<div class="palette-card__meta">
											<span>{block.inputs.length} in</span>
											<span>{block.outputs.length} out</span>
											{#if block.supportsState}
												<span>stateful</span>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						</section>
					{:else}
						<p class="empty-state">No blocks match that filter.</p>
					{/each}
				</div>
			{:else}
				<div class="sidebar-rail">
					<span>Palette</span>
				</div>
			{/if}
		</aside>

		<section class="panel-card canvas-panel">
			<div class="canvas-toolbar">
				<div>
					<p class="eyebrow">Workspace</p>
					<h2>Graph Editor</h2>
				</div>

				<div class="canvas-toolbar__stats">
					<div>
						<span>Nodes</span>
						<strong>{$graphStats.nodes}</strong>
					</div>
					<div>
						<span>Wires</span>
						<strong>{$graphStats.edges}</strong>
					</div>
					<div>
						<span>Outputs</span>
						<strong>{$graphStats.outputs}</strong>
					</div>
				</div>
			</div>

			<div class="flow-shell" bind:this={flowShell}>
				<SvelteFlow
					bind:nodes={flowNodes}
					bind:edges={flowEdges}
					bind:viewport={flowViewport}
					{nodeTypes}
					fitView
					panOnScroll
					selectionOnDrag
					snapGrid={[24, 24]}
					minZoom={0.3}
					maxZoom={1.8}
					isValidConnection={validateConnection}
					onconnect={handleConnect}
					onnodeclick={({ node }) => setSelection({ kind: 'node', id: node.id })}
					onedgeclick={({ edge }) => setSelection({ kind: 'edge', id: edge.id })}
					onpaneclick={() => setSelection(null)}
					onselectionchange={handleSelectionChange}
					onnodedragstop={handleNodeDragStop}
					ondelete={handleDelete}
				>
					<Background variant={BackgroundVariant.Dots} gap={24} size={1.6} />
					<Controls />
					<MiniMap />
				</SvelteFlow>
			</div>
		</section>

		<aside class="panel-card inspector-panel" class:sidebar-panel--collapsed={inspectorCollapsed}>
			<div class="panel-header panel-header--sidebar">
				<div class="sidebar-title">
					<p class="eyebrow">Config</p>
					<h2>{inspectorCollapsed ? 'Config' : 'Configuration'}</h2>
				</div>
				<button
					type="button"
					class="collapse-button"
					aria-expanded={!inspectorCollapsed}
					aria-label={inspectorCollapsed
						? 'Expand configuration sidebar'
						: 'Collapse configuration sidebar'}
					onclick={() => (inspectorCollapsed = !inspectorCollapsed)}
				>
					{inspectorCollapsed ? 'Show' : 'Hide'}
				</button>
			</div>

			{#if !inspectorCollapsed}
				<section class="inspector-section">
					<div class="panel-header">
						<div>
							<p class="eyebrow">Simulation</p>
							<h2>Run Setup</h2>
						</div>
					</div>

					<label>
						<span>Project Name</span>
						<div class="field-with-action">
							<input
								type="text"
								value={$project.meta.name}
								onchange={(event) =>
									setProjectName((event.currentTarget as HTMLInputElement).value)}
							/>
							<button
								type="button"
								class="input-aux-button input-aux-button--danger"
								aria-label="Clear workspace"
								title="Clear nodes, wires, and outputs"
								onclick={clearWorkspace}
							>
								Clear
							</button>
						</div>
					</label>

					<div class="numeric-grid">
						<label>
							<span>Duration (s)</span>
							<input
								type="number"
								min={MIN_SIMULATION_TIME_SECONDS}
								step={MIN_SIMULATION_TIME_SECONDS}
								value={$project.simulation.duration}
								onchange={(event) => updateSimulationField('duration', event)}
							/>
						</label>

						<label>
							<span>Step Size (s)</span>
							<input
								type="number"
								min={MIN_SIMULATION_TIME_SECONDS}
								step={MIN_SIMULATION_TIME_SECONDS}
								value={$project.simulation.stepSize}
								onchange={(event) => updateSimulationField('stepSize', event)}
							/>
						</label>

						<label>
							<span>Playback Rate</span>
							<input
								type="number"
								min={MIN_PLAYBACK_RATE}
								step="0.1"
								value={$project.simulation.playbackRate}
								onchange={(event) => updateSimulationField('playbackRate', event)}
							/>
						</label>

						<label>
							<span>Decimation</span>
							<input
								type="number"
								min="1"
								step="1"
								value={$project.simulation.sampleDecimation}
								onchange={(event) => updateSimulationField('sampleDecimation', event)}
							/>
						</label>
					</div>
				</section>

				<section class="inspector-section">
					<div class="panel-header">
						<div>
							<p class="eyebrow">Selection</p>
							<h2>Inspector</h2>
						</div>
						<button type="button" class="action-button" onclick={removeSelection}>Delete</button>
					</div>

					{#if $selectedNode && selectedDefinition}
						<label>
							<span>Label</span>
							<input
								type="text"
								value={$selectedNode.label}
								onchange={(event) =>
									updateNodeLabel(
										$selectedNode.id,
										(event.currentTarget as HTMLInputElement).value
									)}
							/>
						</label>

						<div class="selection-copy">{selectedDefinition.description}</div>

						<div class="inspector-subsection">
							<h3>Parameters</h3>
							<div class="parameter-list">
								{#each selectedDefinition.parameters as parameter}
									<label>
										<span>{parameter.label}</span>
										{#if parameter.kind === 'boolean'}
											<input
												type="checkbox"
												checked={Boolean($selectedNode.parameters[parameter.key])}
												onchange={(event) => updateParameterField(parameter, event)}
											/>
										{:else if parameter.kind === 'select'}
											<select
												value={String(
													$selectedNode.parameters[parameter.key] ?? parameter.defaultValue
												)}
												onchange={(event) => updateParameterField(parameter, event)}
											>
												{#each parameter.options ?? [] as option}
													<option value={option.value}>{option.label}</option>
												{/each}
											</select>
										{:else if parameter.kind === 'textarea'}
											<div class="textarea-field">
												<textarea
													rows="8"
													placeholder={parameter.placeholder}
													value={String(
														$selectedNode.parameters[parameter.key] ?? parameter.defaultValue
													)}
													onchange={(event) => updateParameterField(parameter, event)}
												></textarea>
												{#if parameter.key === 'csvData'}
													<button
														type="button"
														class="input-aux-button"
														onclick={() => openCsvParameterImport(parameter.key)}
													>
														Load CSV
													</button>
												{/if}
											</div>
										{:else}
											<input
												type={parameter.kind === 'number' ? 'number' : 'text'}
												min={parameter.min}
												max={parameter.max}
												step={parameter.step}
												placeholder={parameter.placeholder}
												value={String(
													$selectedNode.parameters[parameter.key] ?? parameter.defaultValue
												)}
												onchange={(event) => updateParameterField(parameter, event)}
											/>
										{/if}
										{#if parameter.description}
											<small>{parameter.description}</small>
										{/if}
									</label>
								{/each}
							</div>
						</div>

						<div class="inspector-subsection">
							<h3>Ports</h3>
							<div class="port-grid">
								<div>
									<strong>Inputs</strong>
									{#if selectedDefinition.inputs.length > 0}
										{#each selectedDefinition.inputs as port}
											<p>{describePort(port)}</p>
										{/each}
									{:else}
										<p>No inputs</p>
									{/if}
								</div>
								<div>
									<strong>Outputs</strong>
									{#if selectedDefinition.outputs.length > 0}
										{#each selectedDefinition.outputs as port}
											<p>{describePort(port)}</p>
										{/each}
									{:else}
										<p>No outputs</p>
									{/if}
								</div>
							</div>
						</div>
					{:else if $selectedEdge}
						<div class="edge-summary">
							<p class="selection-copy">Selected wire</p>
							<p><strong>From</strong> {$selectedEdge.source}:{$selectedEdge.sourcePortId}</p>
							<p><strong>To</strong> {$selectedEdge.target}:{$selectedEdge.targetPortId}</p>
							<label>
								<span>Wire Label</span>
								<input
									type="text"
									placeholder="Optional label"
									value={$selectedEdge.label ?? ''}
									onchange={(event) =>
										updateEdgeLabel(
											$selectedEdge.id,
											(event.currentTarget as HTMLInputElement).value
										)}
								/>
							</label>
						</div>
					{:else}
						<p class="empty-state">
							Select a node or wire to edit parameters, ports, and bindings.
						</p>
					{/if}
				</section>

				<section class="inspector-section">
					<div class="panel-header">
						<div>
							<p class="eyebrow">Status</p>
							<h2>Validation</h2>
						</div>
					</div>

					{#if loadError}
						<p class="error-banner">{loadError}</p>
					{/if}

					{#if $simulationErrorMessage}
						<p class="error-banner">{$simulationErrorMessage}</p>
					{/if}

					<ul class="validation-list">
						{#each $validationMessages as message}
							<li class={`validation-list__item validation-list__item--${message.level}`}>
								{message.message}
							</li>
						{/each}
					</ul>
				</section>
			{:else}
				<div class="sidebar-rail">
					<span>Configuration</span>
				</div>
			{/if}
		</aside>
	</div>

	<footer class="transport-bar panel-card">
		<div class="transport-group">
			<button type="button" class="action-button" onclick={jumpToStart}>Reset</button>
			<button type="button" class="action-button" onclick={rerunSimulation}>
				{$needsRun ? 'Run' : 'Recompute'}
			</button>
			<button type="button" class="action-button action-button--primary" onclick={togglePlayback}>
				{$playing ? 'Pause' : 'Play'}
			</button>
		</div>

		<label class="timeline-control">
			<span>Timeline</span>
			<input
				type="range"
				min="0"
				max={$project.simulation.duration}
				step={$project.simulation.stepSize}
				value={$currentTime}
				oninput={(event) => setCurrentTime(Number((event.currentTarget as HTMLInputElement).value))}
			/>
		</label>

		<div class="transport-group transport-group--stats">
			<div>
				<span>Cursor</span>
				<strong>{formatTime($currentTime)} s</strong>
			</div>
			<div>
				<span>Samples</span>
				<strong
					>{$simulationSummary?.sampleCount ??
						Math.floor($project.simulation.duration / $project.simulation.stepSize) + 1}</strong
				>
			</div>
			<div>
				<span>Status</span>
				<strong>{formatRunState($runState)}</strong>
			</div>
		</div>
	</footer>

	<section class="panel-card results-panel">
		<div class="panel-header">
			<div>
				<p class="eyebrow">Results</p>
				<h2>Output Preview</h2>
			</div>
		</div>

		<div class="results-grid">
			{#each $project.outputs as output}
				{@const signalKey =
					output.sourceNodeId && output.sourcePortId
						? createSignalKey(output.sourceNodeId, output.sourcePortId)
						: null}
				{@const series = signalKey ? simulationSeriesByKey.get(signalKey) : undefined}
				<article
					class="result-card"
					class:result-card--plot={output.kind === 'plot' && Boolean(signalKey && series)}
				>
					<div class="result-card__header">
						<div>
							<p class="eyebrow">{output.kind === 'plot' ? 'Plot' : 'Value'}</p>
							<h3>{output.label}</h3>
						</div>
						{#if signalKey}
							<span class="result-chip">bound</span>
						{:else}
							<span class="result-chip result-chip--muted">unbound</span>
						{/if}
					</div>

					<div class="result-preview">
						{#if !signalKey}
							<p class="empty-state">Bind this output to a signal below to preview it.</p>
						{:else if !$simulationResult || !series}
							<p class="empty-state">Run or recompute the simulation to refresh this preview.</p>
						{:else if output.kind === 'value'}
							<div class="value-preview">
								<strong>{formatSignalValue($currentSignalValues[signalKey])}</strong>
								<span>{series.label} at {formatTime($currentTime)} s</span>
							</div>
						{:else}
							<SignalPlot
								title={output.label}
								times={$simulationResult.times}
								series={[{ label: series.label, values: series.values, color: output.color }]}
								currentTime={$currentTime}
								isPlaying={$playing}
							/>
						{/if}
					</div>

					<div class="result-config">
						<div class="result-config__grid">
							<label>
								<span>Label</span>
								<input
									type="text"
									value={output.label}
									onchange={(event) =>
										updateOutput(output.id, {
											label: (event.currentTarget as HTMLInputElement).value || output.label
										})}
								/>
							</label>

							<label>
								<span>Mode</span>
								<select
									value={output.kind}
									onchange={(event) =>
										updateOutput(output.id, {
											kind: (event.currentTarget as HTMLSelectElement).value as 'value' | 'plot'
										})}
								>
									<option value="plot">Plot</option>
									<option value="value">Value</option>
								</select>
							</label>

							<label class="result-config__signal-field">
								<span>Signal</span>
								<select
									value={getSignalSelectionValue(output)}
									onchange={(event) => selectSignalOption(output, event)}
								>
									<option value="">Unbound</option>
									{#each $availableSignals as signal}
										<option value={signal.key}>{renderSignalOption(signal)}</option>
									{/each}
								</select>
							</label>
						</div>

						<div class="result-config__actions">
							<button type="button" class="ghost-button" onclick={() => removeOutput(output.id)}
								>Remove</button
							>
						</div>
					</div>
				</article>
			{:else}
				<p class="empty-state">No outputs configured yet. Add one below to start a watch list.</p>
			{/each}

			<button type="button" class="result-add-card" onclick={addOutputFromSelection}>
				<span class="eyebrow">New Binding</span>
				<strong>Add output preview</strong>
				<p>Create a new plot or value card, optionally seeded from the currently selected node.</p>
			</button>
		</div>
	</section>

	<section class="panel-card guide-panel">
		<div class="panel-header">
			<div>
				<p class="eyebrow">Guide</p>
				<h2>What This Page Does</h2>
			</div>
		</div>
		<div class="guide-panel__copy">
			<p>
				This sandbox is a fixed-step signal and systems workspace for sketching sources, arithmetic,
				timing, and dynamic blocks, then watching the resulting signals over time.
			</p>
			<p>
				Add blocks from the left palette, wire outputs into matching inputs in the center canvas,
				and edit simulation or block parameters from the right. Then add output previews at the
				bottom, bind each one to a signal, run the model, and use the playback bar to scrub or
				animate the response.
			</p>
			<p>
				Note this project was vibe-coded. I needed a quick simulation tool for a motor control
				project, rather than focusing on it as a whole project. While everything I've reviewed seems
				to function correctly, use this as a quick development tool or visualizer rather than a
				hard-truth simulation. I'm sure there exists better computation algorithms especially since
				the line between discrete and continuous elements is quite blurry in this simulator.
				Needless to say it's spaghetti code.
			</p>
		</div>
	</section>
</section>

<style>
	.signal-sim-route {
		display: grid;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		padding-bottom: 12rem;
	}

	.panel-card {
		border-radius: 1.3rem;
		padding: 1rem;
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--theme-bg-primary) 72%, white 28%),
				transparent
			),
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--theme-bg-secondary) 84%, #dcf8ff 16%),
				var(--theme-bg-primary)
			);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 30%, transparent);
		box-shadow: 0 18px 32px rgba(21, 34, 44, 0.12);
	}

	.hero-card {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: center;
		background:
			radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--theme-highlight) 18%, transparent),
				transparent 40%
			),
			linear-gradient(
				160deg,
				color-mix(in srgb, var(--theme-bg-primary) 68%, white 32%),
				var(--theme-bg-secondary)
			);
	}

	.hero-card__copy {
		display: grid;
		gap: 0.8rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.74rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--theme-text-secondary);
	}

	h1,
	h2,
	h3 {
		margin: 0;
	}

	h1 {
		margin-top: 0.35rem;
		font-size: clamp(1.8rem, 4vw, 2.8rem);
	}

	h2 {
		margin-top: 0.2rem;
		font-size: 1.2rem;
	}

	h3 {
		font-size: 0.95rem;
		letter-spacing: 0.08em;
	}

	.selection-copy,
	.empty-state,
	.validation-list__item,
	label span,
	.palette-card p {
		font-family: var(--font-body);
	}

	.hero-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.hero-summary span {
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-bg-primary) 72%, white 28%);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 18%, transparent);
		font-size: 0.74rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-text-secondary);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: end;
		gap: 0.6rem;
	}

	.hero-sidecar {
		display: grid;
		gap: 0.55rem;
		justify-items: end;
	}

	.hero-share-status {
		margin: 0;
		max-width: 24rem;
		font-size: 0.82rem;
		line-height: 1.35;
		text-align: right;
		color: var(--theme-text-secondary);
	}

	.share-dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgba(11, 19, 27, 0.52);
		backdrop-filter: blur(12px);
	}

	.share-dialog {
		width: min(40rem, 100%);
		display: grid;
		gap: 1rem;
	}

	.share-dialog__copy,
	.share-dialog__status {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.45;
		color: var(--theme-text-secondary);
	}

	.share-dialog__field {
		width: 100%;
		min-height: 8.5rem;
		padding: 0.95rem;
		resize: vertical;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 24%, transparent);
		border-radius: 0.95rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 76%, white 24%);
		color: var(--theme-text-primary);
		font: inherit;
		line-height: 1.45;
	}

	.share-dialog__actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.65rem;
	}

	.action-button,
	.ghost-button,
	.palette-card {
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 28%, transparent);
		border-radius: 0.9rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 72%, white 28%);
		color: var(--theme-text-primary);
		cursor: pointer;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}

	.action-button {
		padding: 0.7rem 1rem;
		font-weight: 600;
	}

	.action-button--primary {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--theme-accent) 70%, white 30%),
			var(--theme-highlight)
		);
		color: #0c1720;
	}

	.action-button:hover,
	.ghost-button:hover,
	.palette-card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--theme-highlight) 62%, white 18%);
	}

	.workspace-grid {
		--palette-column: minmax(15rem, 18rem);
		--inspector-column: minmax(18rem, 21rem);
		display: grid;
		grid-template-columns: var(--palette-column) minmax(0, 1fr) var(--inspector-column);
		gap: 1rem;
		align-items: start;
	}

	.workspace-grid--palette-collapsed {
		--palette-column: 4.75rem;
	}

	.workspace-grid--inspector-collapsed {
		--inspector-column: 4.75rem;
	}

	.palette-panel,
	.inspector-panel {
		display: grid;
		gap: 1rem;
		max-height: 72vh;
		overflow: auto;
		min-width: 0;
		align-content: start;
	}

	.sidebar-panel__top {
		display: grid;
		gap: 0.8rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.8rem;
	}

	.panel-header--sidebar {
		align-items: center;
	}

	.sidebar-title {
		display: grid;
		gap: 0.15rem;
		min-width: 0;
	}

	.sidebar-title h2 {
		margin-top: 0;
	}

	.collapse-button {
		padding: 0.55rem 0.75rem;
		min-width: 3.5rem;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 24%, transparent);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 76%, white 24%);
		color: var(--theme-text-primary);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.sidebar-panel--collapsed {
		padding-inline: 0.55rem;
		overflow: hidden;
		justify-items: center;
	}

	.sidebar-panel--collapsed .panel-header--sidebar {
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
	}

	.sidebar-panel--collapsed .sidebar-title {
		justify-items: center;
		text-align: center;
	}

	.sidebar-panel--collapsed .sidebar-title .eyebrow,
	.sidebar-panel--collapsed .sidebar-title h2,
	.sidebar-rail span {
		writing-mode: vertical-rl;
		transform: rotate(180deg);
	}

	.sidebar-panel--collapsed .sidebar-title h2 {
		font-size: 0.92rem;
		letter-spacing: 0.18em;
	}

	.sidebar-panel--collapsed .collapse-button {
		width: 100%;
		min-width: 0;
	}

	.sidebar-rail {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 16rem;
	}

	.sidebar-rail span {
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--theme-text-secondary);
	}

	.sidebar-panel__top input,
	.inspector-section input,
	.inspector-section select {
		width: 100%;
	}

	.palette-groups,
	.palette-cards,
	.parameter-list,
	.validation-list {
		display: grid;
		gap: 0.7rem;
	}

	.palette-group {
		display: grid;
		gap: 0.6rem;
	}

	.palette-group header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.palette-group header span {
		padding: 0.25rem 0.55rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-accent) 28%, transparent);
		font-size: 0.72rem;
	}

	.palette-card {
		padding: 0.85rem;
		text-align: left;
		display: grid;
		gap: 0.45rem;
	}

	.palette-card__top,
	.palette-card__meta,
	.canvas-toolbar,
	.transport-group {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
	}

	.palette-card__top span {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		padding: 0.2rem 0.45rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-highlight) 18%, white 82%);
	}

	.palette-card p {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.35;
		color: var(--theme-text-secondary);
	}

	.palette-card__meta {
		justify-content: start;
		flex-wrap: wrap;
	}

	.palette-card__meta span,
	.canvas-toolbar__stats span,
	.transport-group span,
	.timeline-control span,
	.port-grid strong {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--theme-text-secondary);
	}

	.canvas-panel {
		display: grid;
		gap: 0.8rem;
		min-height: 72vh;
	}

	.canvas-toolbar__stats {
		display: flex;
		gap: 1rem;
	}

	.canvas-toolbar__stats div,
	.transport-group--stats div {
		display: grid;
		gap: 0.15rem;
	}

	.flow-shell {
		min-height: 60vh;
		border-radius: 1rem;
		overflow: hidden;
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--theme-highlight) 12%, transparent),
				transparent 55%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--theme-bg-secondary) 78%, #eefcff 22%),
				var(--theme-bg-primary)
			);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 25%, transparent);
	}

	.flow-shell :global(.svelte-flow) {
		height: 100%;
	}

	.flow-shell :global(.svelte-flow__controls-button) {
		background: color-mix(in srgb, var(--theme-bg-primary) 78%, white 22%);
		border-color: color-mix(in srgb, var(--theme-highlight) 28%, transparent);
	}

	.flow-shell :global(.svelte-flow__minimap) {
		pointer-events: none;
	}

	.inspector-section {
		display: grid;
		gap: 0.8rem;
	}

	label {
		display: grid;
		gap: 0.35rem;
	}

	.field-with-action {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem;
		align-items: stretch;
	}

	label span,
	small,
	.port-grid p,
	.selection-copy,
	.edge-summary p {
		color: var(--theme-text-secondary);
	}

	input,
	select {
		box-sizing: border-box;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 24%, transparent);
		border-radius: 0.8rem;
		padding: 0.7rem 0.8rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 80%, white 20%);
		font: inherit;
		color: var(--theme-text-primary);
	}

	input[type='checkbox'] {
		width: auto;
	}

	textarea {
		min-height: 8rem;
		resize: vertical;
	}

	.textarea-field {
		display: grid;
		gap: 0.45rem;
	}

	.input-aux-button {
		justify-self: start;
		padding: 0.45rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 22%, transparent);
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 78%, white 22%);
		color: var(--theme-text-primary);
		font: inherit;
		cursor: pointer;
	}

	.field-with-action .input-aux-button {
		justify-self: stretch;
		white-space: nowrap;
	}

	.input-aux-button--danger {
		border-color: color-mix(in srgb, #9b3939 36%, transparent);
		background: color-mix(in srgb, #fff1f1 76%, var(--theme-bg-primary) 24%);
		color: color-mix(in srgb, #7f2020 88%, var(--theme-text-primary) 12%);
	}

	.numeric-grid,
	.port-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.port-grid div,
	.edge-summary,
	.value-preview {
		padding: 0.8rem;
		border-radius: 0.95rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 74%, white 26%);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 18%, transparent);
	}

	.port-grid p,
	.edge-summary p {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
	}

	.results-panel {
		display: grid;
		gap: 1rem;
	}

	.results-panel__copy,
	.guide-panel__copy p,
	.result-config__hint,
	.result-add-card p {
		margin: 0;
		font-family: var(--font-body);
		line-height: 1.45;
		color: var(--theme-text-secondary);
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: 1rem;
		align-items: start;
	}

	.result-card {
		display: grid;
		gap: 0.8rem;
		padding: 0.9rem;
		border-radius: 1rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 74%, white 26%);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 18%, transparent);
	}

	.result-card--plot {
		grid-column: span 2;
	}

	.result-preview,
	.result-config {
		display: grid;
		gap: 0.8rem;
	}

	.result-config {
		padding-top: 0.85rem;
		border-top: 1px solid color-mix(in srgb, var(--theme-highlight) 16%, transparent);
	}

	.result-config__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.result-config__signal-field {
		grid-column: 1 / -1;
	}

	.result-config__actions {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: start;
	}

	.result-config__hint {
		max-width: 38rem;
	}

	.result-card__header {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: start;
	}

	.result-chip {
		padding: 0.28rem 0.58rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-highlight) 18%, white 82%);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	.result-chip--muted {
		background: color-mix(in srgb, var(--theme-bg-secondary) 40%, white 60%);
	}

	.result-add-card {
		display: grid;
		gap: 0.55rem;
		padding: 1rem;
		border: 1px dashed color-mix(in srgb, var(--theme-highlight) 36%, transparent);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 64%, white 36%);
		text-align: left;
		cursor: pointer;
		color: var(--theme-text-primary);
	}

	.value-preview {
		display: grid;
		gap: 0.25rem;
		padding: 0.9rem;
	}

	.value-preview strong {
		font-size: 1.55rem;
		letter-spacing: 0.06em;
	}

	.value-preview span {
		font-family: var(--font-body);
		font-size: 0.82rem;
		color: var(--theme-text-secondary);
	}

	.guide-panel {
		display: grid;
		gap: 0.9rem;
	}

	.guide-panel__copy {
		display: grid;
		gap: 0.75rem;
	}

	.ghost-button {
		padding: 0.45rem 0.7rem;
		font-size: 1rem;
		line-height: 1;
	}

	.validation-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.validation-list__item {
		padding: 0.75rem 0.85rem;
		border-radius: 0.9rem;
		font-size: 0.84rem;
		line-height: 1.35;
	}

	.validation-list__item--info {
		background: color-mix(in srgb, var(--theme-accent) 18%, white 82%);
	}

	.validation-list__item--warning {
		background: color-mix(in srgb, #f5c15a 28%, white 72%);
	}

	.validation-list__item--error,
	.error-banner {
		background: color-mix(in srgb, #d96262 22%, white 78%);
	}

	.error-banner {
		margin: 0;
		padding: 0.8rem;
		border-radius: 0.9rem;
	}

	.transport-bar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		gap: 1rem;
		align-items: center;
		position: fixed;
		left: clamp(0.75rem, 1.5vw, 1.5rem);
		right: clamp(0.75rem, 1.5vw, 1.5rem);
		bottom: 0.75rem;
		z-index: 10;
		pointer-events: none;
		backdrop-filter: blur(12px);
	}

	.transport-bar > * {
		pointer-events: auto;
	}

	.timeline-control {
		display: grid;
		gap: 0.5rem;
	}

	.timeline-control input[type='range'] {
		padding: 0;
	}

	.transport-group--stats {
		justify-content: end;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	@media (max-width: 1200px) {
		.workspace-grid {
			grid-template-columns: var(--palette-column) minmax(0, 1fr);
		}

		.workspace-grid--inspector-collapsed {
			grid-template-columns: var(--palette-column) minmax(0, 1fr) var(--inspector-column);
		}

		.inspector-panel {
			grid-column: 1 / -1;
			max-height: none;
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.workspace-grid--inspector-collapsed .inspector-panel.sidebar-panel--collapsed {
			grid-column: auto;
			grid-template-columns: 1fr;
			max-height: 72vh;
		}

		.transport-bar {
			grid-template-columns: 1fr;
		}

		.result-card--plot {
			grid-column: auto;
		}

		.result-config__grid {
			grid-template-columns: 1fr;
		}

		.share-dialog__actions,
		.result-config__actions {
			flex-direction: column;
		}
	}

	@media (min-width: 1201px) {
		.signal-sim-route {
			padding-bottom: 8rem;
		}
	}

	@media (max-width: 840px) {
		.hero-card,
		.workspace-grid,
		.inspector-panel,
		.results-grid,
		.numeric-grid,
		.port-grid {
			grid-template-columns: 1fr;
		}

		.hero-card,
		.canvas-toolbar,
		.hero-actions,
		.transport-group,
		.transport-group--stats {
			flex-direction: column;
			align-items: stretch;
		}

		.palette-panel,
		.inspector-panel {
			max-height: none;
		}

		.flow-shell {
			min-height: 50vh;
		}

		.sidebar-panel--collapsed {
			justify-items: stretch;
		}

		.sidebar-panel--collapsed .panel-header--sidebar {
			flex-direction: row;
			align-items: center;
		}

		.sidebar-panel--collapsed .sidebar-title {
			justify-items: start;
			text-align: left;
		}

		.sidebar-panel--collapsed .sidebar-title .eyebrow,
		.sidebar-panel--collapsed .sidebar-title h2,
		.sidebar-rail span {
			writing-mode: initial;
			transform: none;
		}

		.sidebar-rail {
			min-height: auto;
			padding: 0.3rem 0 0;
		}
	}

	@media print {
		.hero-actions,
		.palette-panel,
		.transport-bar button,
		.flow-shell :global(.svelte-flow__controls),
		.flow-shell :global(.svelte-flow__minimap),
		.flow-shell :global(.svelte-flow__attribution) {
			display: none !important;
		}

		.signal-sim-route {
			gap: 0.5rem;
		}

		.workspace-grid {
			grid-template-columns: 1fr 20rem;
		}

		.panel-card {
			box-shadow: none;
			border-color: #cbd5db;
		}
	}
</style>
