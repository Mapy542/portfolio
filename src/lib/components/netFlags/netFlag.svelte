<script lang="ts">
	import type { Snippet } from 'svelte';

	export type FlagType = 'output' | 'input' | 'bidirectional' | 'short';

	const { children, flagType }: { children: Snippet; flagType: FlagType } = $props();
</script>

<div class="netFlag">
	<!-- Left cap; the wider viewBox includes the output/short pin stub. -->
	<svg
		viewBox={flagType === 'output' || flagType === 'short' ? '0 0 32 40' : '12 0 20 40'}
		class="netFlag-svg"
		class:netFlag-cap-stub={flagType === 'output' || flagType === 'short'}
		aria-hidden="true"
	>
		{#if flagType === 'output' || flagType === 'short'}
			<!-- Left pin stub: output and short flags only. -->
			<path d="M 2 20 H 13" fill="none" stroke-width="2" stroke-linecap="round" />
		{/if}
		<!-- Left body edge: rounded hexagon point for bidirectional, pill end otherwise. -->
		<path
			d={flagType === 'bidirectional'
				? 'M 32 38 Q 26 38 22.672 33.008 L 16.219 23.328 Q 14 20 16.219 16.672 L 22.672 6.992 Q 26 2 32 2'
				: 'M 32 38 A 18 18 0 0 1 32 2'}
		/>
	</svg>
	<!-- Only the middle SVG stretches; its edges share the caps' y=2 and y=38 coordinates. -->
	<span class="netFlag-text">
		<svg
			viewBox="0 0 100 40"
			preserveAspectRatio="none"
			class="netFlag-svg netFlag-body"
			aria-hidden="true"
		>
			<rect x="0" y="2" width="100" height="36" stroke="none" />
			<path d="M 0 2 H 100 M 0 38 H 100" fill="none" />
		</svg>
		<span class="netFlag-label">{@render children()}</span>
	</span>
	<!-- Right cap; all types except output include space for a pin stub. -->
	<svg
		viewBox={flagType === 'output' ? '0 0 20 40' : '0 0 32 40'}
		class="netFlag-svg"
		class:netFlag-cap-stub={flagType !== 'output'}
		aria-hidden="true"
	>
		{#if flagType !== 'output'}
			<!-- Right pin stub: input, bidirectional, and short flags. -->
			<!-- Account for the rounded tip and stub's round linecap so it does not enter the fill. -->
			<path
				d={flagType === 'short' ? 'M 19 20 H 30' : 'M 17.891 20 H 30'}
				fill="none"
				stroke-width="2"
				stroke-linecap="round"
			/>
		{/if}
		<!-- Right body edge: pill end for short, rounded arrow point otherwise. -->
		<path
			d={flagType === 'short'
				? 'M 0 2 A 18 18 0 0 1 0 38'
				: 'M 0 2 Q 6 2 9.328 6.992 L 15.781 16.672 Q 18 20 15.781 23.328 L 9.328 33.008 Q 6 38 0 38'}
		/>
	</svg>
</div>

<style>
	.netFlag-svg {
		display: block;
		width: 1.125rem;
		height: 100%;
		overflow: visible;
		fill: var(--flag-fill);
		stroke: var(--flag-stroke);
		stroke-width: 1;
		transition:
			fill var(--transition-length),
			stroke var(--transition-length);
	}

	.netFlag-svg path {
		vector-effect: non-scaling-stroke;
	}

	.netFlag-cap-stub {
		width: 1.8rem;
	}

	.netFlag {
		--flag-fill: var(--theme-bg-primary);
		--flag-stroke: transparent;
		display: inline-grid;
		grid-template-columns: auto max-content auto;
		align-items: center;
		width: fit-content;
		height: 2.25rem;
		vertical-align: middle;
	}

	.netFlag:hover {
		--flag-fill: color-mix(in oklab, var(--theme-accent) 15%, var(--theme-bg-primary) 85%);
		--flag-stroke: color-mix(in oklab, var(--theme-accent) 70%, var(--theme-bg-primary) 30%);
	}

	.netFlag-text {
		position: relative;
		white-space: nowrap;
		user-select: none;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		height: 100%;
		padding: 0 0.25rem;
		color: var(--theme-text-primary);
	}

	.netFlag-body {
		position: absolute;
		/* Overlap the cap fills slightly to avoid antialiasing gaps at fractional pixel widths. */
		inset: 0 -0.5px;
		width: calc(100% + 1px);
		pointer-events: none;
	}

	.netFlag-label {
		position: relative;
	}
</style>
