<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	import type { SignalFlowNodeData } from '$lib/signal-sim/flow';
	import { describePort } from '$lib/signal-sim/flow';

	export let data: SignalFlowNodeData;
	export let selected = false;

	type CompactShape = 'circle' | 'rectangle' | 'pin' | null;

	function getCompactShape(blockType: string): CompactShape {
		switch (blockType) {
			case 'gain':
			case 'signal-clamp':
			case 'differentiator':
			case 'sample-delay':
				return 'rectangle';
			case 'route-pin':
				return 'pin';
			case 'sum':
			case 'sum-3':
			case 'sum-4':
				return 'circle';
			default:
				return null;
		}
	}

	function getHandleOffset(index: number, total: number): string {
		if (total <= 1) {
			return '50%';
		}

		const step = 100 / (total + 1);
		return `${step * (index + 1)}%`;
	}

	$: compactShape = getCompactShape(data.blockType);
	$: compactGlyph = data.blockType.startsWith('sum') ? '+' : data.compactGlyph;
	$: showCompactLabel = data.blockType !== 'route-pin';
	$: notePreview = data.noteContent.trim();
</script>

{#if compactShape}
	<div class="compact-node" class:selected title={data.label}>
		<div class={`compact-node__body compact-node__body--${compactShape}`}>
			{#each data.inputs as port, index}
				<Handle
					id={port.id}
					type="target"
					position={Position.Left}
					style={`top: ${getHandleOffset(index, data.inputs.length)};`}
					class="signal-handle signal-handle--input"
				/>
			{/each}

			{#if compactShape === 'pin'}
				<span class="compact-node__pin-dot" aria-hidden="true"></span>
			{:else}
				<span class="compact-node__glyph">{compactGlyph}</span>
			{/if}

			{#each data.outputs as port, index}
				<Handle
					id={port.id}
					type="source"
					position={Position.Right}
					style={`top: ${getHandleOffset(index, data.outputs.length)};`}
					class="signal-handle signal-handle--output"
				/>
			{/each}
		</div>

		{#if showCompactLabel}
			<span class="compact-node__label">{data.label}</span>
		{/if}
	</div>
{:else if data.blockType === 'note'}
	<div class="note-node" class:selected title={data.label}>
		<div class="note-node__header">
			<h3>{data.label}</h3>
			<span>Note</span>
		</div>
		<div class="note-node__body">
			{#if notePreview}
				{notePreview}
			{:else}
				Add note content in the inspector.
			{/if}
		</div>
	</div>
{:else}
	<div class="block-node-card" class:selected>
		<div class="block-node-card__header">
			<h3>{data.label}</h3>
			<span class="block-node-card__token">{data.shortLabel}</span>
		</div>

		<div class="block-node-card__meta">
			<span>{data.category}</span>
			{#if data.supportsState}
				<span class="block-node-card__badge">stateful</span>
			{/if}
		</div>

		{#if data.parameterSummary.length > 0}
			<div class="block-node-card__summary">
				{#each data.parameterSummary as line}
					<span>{line}</span>
				{/each}
			</div>
		{/if}

		<div class="block-node-card__ports">
			<div class="ports-column">
				<span class="ports-column__title">Inputs</span>
				{#if data.inputs.length > 0}
					{#each data.inputs as port}
						<div class="port-row port-row--input" title={describePort(port)}>
							<Handle
								id={port.id}
								type="target"
								position={Position.Left}
								class="signal-handle signal-handle--input"
							/>
							<span>{port.label}</span>
						</div>
					{/each}
				{:else}
					<p class="ports-column__empty">No inputs</p>
				{/if}
			</div>

			<div class="ports-column">
				<span class="ports-column__title ports-column__title--right">Outputs</span>
				{#if data.outputs.length > 0}
					{#each data.outputs as port}
						<div class="port-row port-row--output" title={describePort(port)}>
							<span>{port.label}</span>
							<Handle
								id={port.id}
								type="source"
								position={Position.Right}
								class="signal-handle signal-handle--output"
							/>
						</div>
					{/each}
				{:else}
					<p class="ports-column__empty ports-column__empty--right">No outputs</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.compact-node {
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		min-width: 0;
		color: var(--theme-text-primary);
	}

	.compact-node__body {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 3.75rem;
		min-height: 2.35rem;
		padding: 0.2rem 0.75rem;
		border: 1.5px solid color-mix(in srgb, var(--theme-highlight) 55%, transparent);
		background: color-mix(in srgb, var(--theme-bg-primary) 86%, white 14%);
		box-shadow: 0 10px 18px rgba(22, 36, 48, 0.1);
	}

	.compact-node__body--rectangle {
		border-radius: 0.45rem;
	}

	.compact-node__body--circle {
		width: 3.35rem;
		min-width: 3.35rem;
		height: 3.35rem;
		min-height: 3.35rem;
		padding: 0;
		border-radius: 999px;
	}

	.compact-node__body--pin {
		width: 1.4rem;
		min-width: 1.4rem;
		height: 1.4rem;
		min-height: 1.4rem;
		padding: 0;
		border-radius: 999px;
		border-color: color-mix(in srgb, var(--theme-highlight) 70%, white 30%);
		box-shadow: 0 6px 14px rgba(22, 36, 48, 0.14);
	}

	.compact-node.selected .compact-node__body {
		outline: 2px solid color-mix(in srgb, var(--theme-highlight) 82%, white 18%);
		outline-offset: 2px;
	}

	.compact-node__glyph {
		font-family: var(--font-mono);
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.compact-node__pin-dot {
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-highlight) 72%, white 28%);
		box-shadow: 0 0 0 0.16rem color-mix(in srgb, var(--theme-highlight) 18%, transparent);
	}

	.compact-node__label {
		max-width: 6.5rem;
		font-family: var(--font-body);
		font-size: 0.68rem;
		line-height: 1.2;
		text-align: center;
		color: var(--theme-text-secondary);
	}

	.note-node {
		width: 15rem;
		min-height: 8rem;
		padding: 0.8rem 0.9rem;
		border-radius: 0.9rem;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 28%, #b58c00 36%);
		background:
			linear-gradient(180deg, rgba(255, 247, 196, 0.96), rgba(255, 239, 164, 0.92)),
			var(--theme-bg-primary);
		box-shadow: 0 16px 28px rgba(79, 60, 5, 0.18);
		color: #4c3800;
	}

	.note-node.selected {
		outline: 2px solid color-mix(in srgb, var(--theme-highlight) 74%, white 26%);
		outline-offset: 2px;
	}

	.note-node__header {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		align-items: baseline;
		margin-bottom: 0.6rem;
	}

	.note-node__header h3 {
		margin: 0;
		font-size: 0.88rem;
		line-height: 1.2;
		color: #5f4700;
	}

	.note-node__header span {
		font-size: 0.66rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(95, 71, 0, 0.72);
	}

	.note-node__body {
		min-height: 5.6rem;
		padding: 0.25rem 0.1rem 0;
		font-family: var(--font-body);
		font-size: 0.77rem;
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
		color: rgba(76, 56, 0, 0.9);
	}

	.block-node-card {
		width: 12rem;
		border-radius: 0.9rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 45%, transparent);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--theme-bg-primary) 75%, white 20%),
				transparent
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--theme-bg-secondary) 82%, #d7f6ff 18%),
				var(--theme-bg-primary)
			);
		box-shadow: 0 14px 26px rgba(22, 36, 48, 0.16);
		color: var(--theme-text-primary);
	}

	.block-node-card.selected {
		outline: 2px solid color-mix(in srgb, var(--theme-highlight) 82%, white 18%);
		outline-offset: 2px;
	}

	.block-node-card__header {
		display: flex;
		justify-content: space-between;
		gap: 0.45rem;
		align-items: center;
	}

	h3 {
		margin: 0;
		font-size: 0.84rem;
		letter-spacing: 0.04em;
		line-height: 1.2;
	}

	.block-node-card__meta {
		display: flex;
		justify-content: space-between;
		gap: 0.45rem;
		align-items: center;
		margin-top: 0.35rem;
		font-size: 0.64rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--theme-text-secondary);
	}

	.block-node-card__token {
		border-radius: 999px;
		padding: 0.22rem 0.5rem;
		background: color-mix(in srgb, var(--theme-accent) 60%, white 40%);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		font-weight: 600;
	}

	.block-node-card__summary span,
	.ports-column__empty,
	.port-row span,
	.block-node-card__badge,
	.compact-node__label {
		font-family: var(--font-body);
	}

	.block-node-card__summary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.55rem 0 0.7rem;
	}

	.block-node-card__summary span {
		padding: 0.18rem 0.42rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-bg-primary) 72%, white 28%);
		font-size: 0.64rem;
		line-height: 1.25;
		color: var(--theme-text-secondary);
	}

	.block-node-card__ports {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.45rem;
	}

	.ports-column {
		display: grid;
		gap: 0.3rem;
	}

	.ports-column__title {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--theme-text-secondary);
	}

	.ports-column__title--right,
	.ports-column__empty--right {
		text-align: right;
	}

	.port-row {
		position: relative;
		border-radius: 0.55rem;
		padding: 0.26rem 0.5rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 70%, white 30%);
		font-size: 0.7rem;
		min-height: 1.55rem;
		display: flex;
		align-items: center;
	}

	.port-row--output {
		justify-content: flex-end;
	}

	.ports-column__empty {
		margin: 0.1rem 0 0;
		font-size: 0.74rem;
		color: var(--theme-text-placeholder);
	}

	.block-node-card__badge {
		display: inline-flex;
		align-items: center;
		padding: 0.18rem 0.42rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--theme-highlight) 24%, transparent);
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}

	:global(.signal-handle) {
		width: 0.74rem;
		height: 0.74rem;
		border-width: 2px;
		background: var(--theme-highlight);
		border-color: color-mix(in srgb, white 80%, var(--theme-highlight) 20%);
	}

	:global(.signal-handle.signal-handle--input) {
		left: -0.45rem;
	}

	:global(.signal-handle.signal-handle--output) {
		right: -0.45rem;
	}
</style>
