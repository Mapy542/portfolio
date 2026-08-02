<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let min = 0;
	export let max = 0;
	export let lowerValue = 0;
	export let upperValue = 0;
	export let step = 1;
	export let valueSuffix = '';
	export let lowerAriaLabel = 'Minimum value';
	export let upperAriaLabel = 'Maximum value';

	const dispatch = createEventDispatcher<{
		change: { lowerValue: number; upperValue: number };
	}>();

	function clamp(value: number, lowerBound: number, upperBound: number): number {
		return Math.min(Math.max(value, lowerBound), upperBound);
	}

	function normalizeLowerValue(candidate: number): number {
		return clamp(candidate, min, upperValue);
	}

	function normalizeUpperValue(candidate: number): number {
		return clamp(candidate, lowerValue, max);
	}

	function emitChange(nextLowerValue: number, nextUpperValue: number) {
		dispatch('change', {
			lowerValue: nextLowerValue,
			upperValue: nextUpperValue
		});
	}

	function handleLowerInput(value: string) {
		emitChange(normalizeLowerValue(Number.parseInt(value || String(min), 10)), upperValue);
	}

	function handleUpperInput(value: string) {
		emitChange(lowerValue, normalizeUpperValue(Number.parseInt(value || String(max), 10)));
	}

	$: normalizedLowerValue = normalizeLowerValue(lowerValue);
	$: normalizedUpperValue = normalizeUpperValue(upperValue);
	$: rangeSpan = Math.max(step, max - min);
	$: lowerPercent = ((normalizedLowerValue - min) / rangeSpan) * 100;
	$: upperPercent = ((normalizedUpperValue - min) / rangeSpan) * 100;
	$: summaryLabel = `${normalizedLowerValue} - ${normalizedUpperValue}${valueSuffix ? ` ${valueSuffix}` : ''}`;
</script>

<div class="double-range-slider">
	<div class="double-range-slider__summary">
		<span>{summaryLabel}</span>
	</div>

	<div class="double-range-slider__surface">
		<div class="double-range-slider__track"></div>
		<div
			class="double-range-slider__active"
			style:left={`${lowerPercent}%`}
			style:right={`${100 - upperPercent}%`}
		></div>
		<input
			type="range"
			{min}
			{max}
			{step}
			value={normalizedLowerValue}
			aria-label={lowerAriaLabel}
			on:input={(event) => handleLowerInput((event.currentTarget as HTMLInputElement).value)}
		/>
		<input
			type="range"
			{min}
			{max}
			{step}
			value={normalizedUpperValue}
			aria-label={upperAriaLabel}
			on:input={(event) => handleUpperInput((event.currentTarget as HTMLInputElement).value)}
		/>
	</div>

	<div class="double-range-slider__bounds">
		<span>{min}</span>
		<span>{max}</span>
	</div>
</div>

<style>
	.double-range-slider {
		display: grid;
		gap: 0.35rem;
	}

	.double-range-slider__summary,
	.double-range-slider__bounds {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--theme-text-secondary);
	}

	.double-range-slider__surface {
		position: relative;
		height: 1.4rem;
		display: grid;
		align-items: center;
	}

	.double-range-slider__track,
	.double-range-slider__active {
		position: absolute;
		left: 0;
		right: 0;
		height: 0.28rem;
		border-radius: 999px;
	}

	.double-range-slider__track {
		background: color-mix(in srgb, var(--pinmux-divider) 86%, transparent);
	}

	.double-range-slider__active {
		background: color-mix(in srgb, var(--pinmux-accent) 78%, white 8%);
	}

	.double-range-slider__surface input[type='range'] {
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		height: 1.4rem;
		transform: translateY(-75%);
		margin: 0;
		pointer-events: none;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
	}

	.double-range-slider__surface input[type='range']::-webkit-slider-runnable-track {
		height: 0.28rem;
		background: transparent;
	}

	.double-range-slider__surface input[type='range']::-webkit-slider-thumb {
		width: 0.95rem;
		height: 0.95rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--pinmux-accent) 32%, var(--pinmux-divider));
		background: var(--pinmux-surface-elevated);
		box-shadow: 0 0 0 1px color-mix(in srgb, white 35%, transparent);
		pointer-events: auto;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
	}

	.double-range-slider__surface input[type='range']::-moz-range-track {
		height: 0.28rem;
		background: transparent;
	}

	.double-range-slider__surface input[type='range']::-moz-range-thumb {
		width: 0.95rem;
		height: 0.95rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--pinmux-accent) 32%, var(--pinmux-divider));
		background: var(--pinmux-surface-elevated);
		box-shadow: 0 0 0 1px color-mix(in srgb, white 35%, transparent);
		pointer-events: auto;
		cursor: pointer;
	}
</style>
