<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let title = 'Signal Plot';
	export let times: number[] = [];
	export let series: Array<{
		label: string;
		values: number[];
		color?: string | null;
	}> = [];
	export let currentTime = 0;
	export let isPlaying = false;

	let container: HTMLDivElement | null = null;
	let plotly: any = null;
	let resizeHandler: (() => void) | null = null;

	function getLastTime(): number {
		return times.length > 0 ? (times[times.length - 1] ?? 0) : 0;
	}

	function shouldShowProgressiveTrace(): boolean {
		const lastTime = getLastTime();
		return isPlaying && currentTime > 0 && currentTime < lastTime;
	}

	function getVisiblePointCount(): number {
		if (!shouldShowProgressiveTrace()) {
			return times.length;
		}

		let nextIndex = times.findIndex((time) => time >= currentTime);
		if (nextIndex === -1) {
			return times.length;
		}

		if (nextIndex === 0) {
			nextIndex = 1;
		}

		return nextIndex;
	}

	function getBaseAxisRange(): [number, number] | undefined {
		if (times.length < 2) {
			return undefined;
		}

		return [times[0] ?? 0, times[times.length - 1] ?? 0];
	}

	async function resetView() {
		if (!container || !plotly?.relayout) {
			return;
		}

		const xRange = getBaseAxisRange();
		await plotly.relayout(container, {
			'xaxis.autorange': xRange ? false : true,
			'xaxis.range': xRange,
			'yaxis.autorange': true
		});
	}

	function getPalette() {
		const styles = container ? getComputedStyle(container) : null;

		return {
			text: styles?.getPropertyValue('--theme-text-secondary').trim() || '#425563',
			grid: 'rgba(79, 115, 136, 0.18)',
			background: 'rgba(255, 255, 255, 0)',
			cursor: styles?.getPropertyValue('--theme-highlight').trim() || '#0097c1'
		};
	}

	async function renderPlot() {
		if (!container || !plotly) {
			return;
		}

		const palette = getPalette();
		const visiblePointCount = getVisiblePointCount();
		const visibleTimes = times.slice(0, visiblePointCount);
		const traces = series.map((trace) => ({
			x: visibleTimes,
			y: trace.values.slice(0, visiblePointCount),
			type: 'scatter',
			mode: 'lines',
			name: trace.label,
			line: {
				color: trace.color ?? palette.cursor,
				width: 2
			},
			hovertemplate: '%{y:.5f}<extra>%{fullData.name}</extra>'
		}));

		await plotly.react(
			container,
			traces,
			{
				uirevision: 'signal-plot',
				title: {
					text: title,
					font: {
						size: 14,
						color: palette.text
					}
				},
				paper_bgcolor: palette.background,
				plot_bgcolor: palette.background,
				font: { color: palette.text },
				margin: { l: 44, r: 16, t: 42, b: 36 },
				xaxis: {
					title: 'Time (s)',
					range: getBaseAxisRange(),
					gridcolor: palette.grid,
					zerolinecolor: palette.grid
				},
				yaxis: {
					automargin: true,
					gridcolor: palette.grid,
					zerolinecolor: palette.grid
				},
				showlegend: series.length > 1,
				shapes:
					times.length > 0
						? [
								{
									type: 'line',
									x0: currentTime,
									x1: currentTime,
									y0: 0,
									y1: 1,
									yref: 'paper',
									line: {
										color: palette.cursor,
										width: 1.5,
										dash: 'dot'
									}
								}
							]
						: []
			},
			{
				displayModeBar: false,
				responsive: true,
				scrollZoom: true,
				doubleClick: 'reset+autosize'
			}
		);
	}

	onMount(async () => {
		const plotlyModule = await import('plotly.js-dist-min');
		plotly = plotlyModule.default ?? plotlyModule;
		await renderPlot();

		resizeHandler = () => {
			if (container && plotly?.Plots?.resize) {
				void plotly.Plots.resize(container);
			}
		};

		window.addEventListener('resize', resizeHandler);
	});

	onDestroy(() => {
		if (container && plotly?.purge) {
			plotly.purge(container);
		}

		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
		}
	});

	$: plotInputs = [title, times, series, currentTime, isPlaying];

	$: if (plotly && container && plotInputs) {
		void renderPlot();
	}
</script>

<div class="signal-plot-shell">
	<div class="signal-plot__toolbar">
		<button type="button" class="signal-plot__reset" onclick={resetView}>Reset View</button>
	</div>
	<div bind:this={container} class="signal-plot"></div>
</div>

<style>
	.signal-plot-shell {
		display: grid;
		gap: 0.5rem;
	}

	.signal-plot__toolbar {
		display: flex;
		justify-content: end;
	}

	.signal-plot__reset {
		padding: 0.4rem 0.7rem;
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 24%, transparent);
		border-radius: 0.7rem;
		background: color-mix(in srgb, var(--theme-bg-primary) 80%, white 20%);
		color: var(--theme-text-primary);
		font: inherit;
		cursor: pointer;
	}

	.signal-plot {
		min-height: 16rem;
		width: 100%;
	}
</style>
