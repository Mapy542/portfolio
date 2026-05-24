<script lang="ts">
	export let groupLabel: string;
	export let formatLabel: string;
	export let importLabel: string | null = null;
	export let exportLabel: string | null = null;
	export let onImport: (() => void) | null = null;
	export let onExport: (() => void) | null = null;

	$: hasImport = !!importLabel && !!onImport;
	$: hasExport = !!exportLabel && !!onExport;
</script>

{#if hasImport || hasExport}
	<div class="action-pill" role="group" aria-label={groupLabel}>
		{#if hasImport}
			<button
				type="button"
				class="action-pill__icon-button"
				aria-label={importLabel ?? undefined}
				title={importLabel ?? undefined}
				on:click={() => onImport?.()}
			>
				<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 15V4" />
					<path d="M8.5 7.5 12 4l3.5 3.5" />
					<path d="M5 14.5v3A1.5 1.5 0 0 0 6.5 19h11A1.5 1.5 0 0 0 19 17.5v-3" />
				</svg>
			</button>
		{/if}

		{#if hasImport && hasExport}
			<span class="action-pill__separator" aria-hidden="true"></span>
		{/if}

		{#if hasExport}
			<button
				type="button"
				class="action-pill__icon-button"
				aria-label={exportLabel ?? undefined}
				title={exportLabel ?? undefined}
				on:click={() => onExport?.()}
			>
				<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 9v11" />
					<path d="M8.5 16.5 12 20l3.5-3.5" />
					<path d="M5 9.5v-3A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v3" />
				</svg>
			</button>
		{/if}

		<span class="action-pill__type">{formatLabel}</span>
	</div>
{/if}

<style>
	.action-pill {
		--transfer-pill-accent: var(--pinmux-accent, var(--theme-highlight, currentColor));
		--transfer-pill-border: var(
			--pinmux-divider,
			color-mix(in srgb, var(--transfer-pill-accent) 18%, transparent)
		);
		--transfer-pill-surface: var(
			--pinmux-surface-elevated,
			color-mix(in srgb, var(--theme-bg-primary, white) 82%, white 18%)
		);
		display: inline-flex;
		align-items: center;
		gap: 0.14rem;
		border-radius: 999px;
		border: 1px solid var(--transfer-pill-border);
		background: var(--transfer-pill-surface);
		padding: 0.2rem 0.32rem 0.2rem 0.2rem;
		width: max-content;
	}

	.action-pill__icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--theme-text-primary, currentColor);
		cursor: pointer;
		transition: background-color 120ms ease;
	}

	.action-pill__icon-button:hover {
		background: color-mix(in srgb, var(--transfer-pill-accent) 12%, transparent);
	}

	.action-pill__icon-button:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--transfer-pill-accent) 52%, transparent);
		outline-offset: 2px;
	}

	.action-pill__separator {
		display: inline-flex;
		align-self: center;
		width: 0.15rem;
		height: 1.55rem;
		margin: 0 0.08rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--transfer-pill-surface) 26%, var(--transfer-pill-border));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--transfer-pill-accent) 14%, transparent);
	}

	.action-pill__type {
		display: inline-flex;
		align-items: center;
		padding: 0 0.78rem 0 0.45rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-text-secondary, currentColor);
	}

	.action-icon {
		width: 1rem;
		height: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}
</style>
