<script lang="ts">
	import type { Snippet } from 'svelte';

	export type FlagType = 'output' | 'input' | 'bidirectional';

	const { children, flagType }: { children: Snippet; flagType: FlagType } = $props();
</script>

<div class="netFlag" class:netFlag-output={flagType === 'output'}>
	<svg viewBox="0 0 120 40" preserveAspectRatio="none" class="netFlag-svg" aria-hidden="true">
		<path
			d={flagType === 'output' ? 'M 2 20 H 14' : 'M 105 20 H 118'}
			fill="none"
			//stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
		/>
		{#if flagType === 'output'}
			<path
				d="M 4 2 H 92 Q 94 2 95 4 L 105 19 Q 106 20 105 21 L 95 36 Q 94 38 92 38 H 4 Q 2 38 2 36 V 4 Q 2 2 4 2 Z"
				transform="translate(12 0)"
				fill="currentColor"
				stroke-width="1"
			/>
		{:else if flagType === 'input'}
			<path
				d="M 4 2 H 92 Q 94 2 95 4 L 105 19 Q 106 20 105 21 L 95 36 Q 94 38 92 38 H 4 Q 2 38 2 36 V 4 Q 2 2 4 2 Z"
				fill="currentColor"
				stroke-width="1"
			/>
		{:else if flagType === 'bidirectional'}
			<path
				d="M 16 2 H 92 Q 94 2 95 4 L 105 19 Q 106 20 105 21 L 95 36 Q 94 38 92 38 H 16 Q 14 38 13 36 L 3 21 Q 2 20 3 19 L 13 4 Q 14 2 16 2 Z"
				fill="currentColor"
				stroke-width="1"
			/>
		{/if}
	</svg>
	<span class="netFlag-text">
		{@render children()}
	</span>
</div>

<style>
	.netFlag-svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: var(--theme-bg-primary);
		transition: color var(--transition-length);
	}

	.netFlag:hover .netFlag-svg {
		color: color-mix(in oklab, var(--theme-accent) 15%, transparent 85%);
		stroke: color-mix(in oklab, var(--theme-accent) 70%, transparent 30%);
	}

	.netFlag {
		position: relative;
		display: inline-grid;
		align-items: center;
		justify-content: center;
		width: fit-content;
		min-width: 6.75rem;
		aspect-ratio: 3;
		vertical-align: middle;
	}

	.netFlag-text {
		position: relative;
		z-index: 1;
		white-space: nowrap;
		user-select: none;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem 1.875rem 0.4rem 1.125rem;
		color: var(--theme-text-primary);
	}

	.netFlag-output .netFlag-text {
		padding-right: 1.125rem;
		padding-left: 1.875rem;
	}
</style>
