<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import type { PackageDefinition } from '$lib/pinmux/model';
	import type { PinRow } from '$lib/pinmux/stores';

	export let packageDefinition: PackageDefinition | null = null;
	export let pins: PinRow[] = [];
	export let focusedPinId: string | null = null;

	const dispatch = createEventDispatcher<{ selectpin: { pinId: string } }>();
	const viewBoxSize = 420;
	const quadPinRailInset = 60;
	const dualRowPinRailInset = 56;
	const bgaGridInset = 96;

	interface VisualPin {
		pin: PinRow;
		x: number;
		y: number;
		labelX: number;
		labelY: number;
		labelAnchor: 'start' | 'middle' | 'end';
		radius?: number;
	}

	interface AxisLabel {
		value: string;
		x: number;
		y: number;
	}

	function createQuadPins(
		rows: PinRow[],
		pinsPerSide: number,
		numbering: PackageDefinition['numbering']
	): VisualPin[] {
		return rows.map((pin, index) => {
			const sideIndex = Math.floor(index / pinsPerSide);
			const offset = index % pinsPerSide;
			const span = viewBoxSize - quadPinRailInset * 2;
			const step = pinsPerSide > 1 ? span / (pinsPerSide - 1) : 0;

			if (numbering === 'cw') {
				if (sideIndex === 0) {
					const x = quadPinRailInset + offset * step;
					return {
						pin,
						x,
						y: 26,
						labelX: x,
						labelY: 14,
						labelAnchor: 'middle'
					};
				}

				if (sideIndex === 1) {
					const y = quadPinRailInset + offset * step;
					return {
						pin,
						x: viewBoxSize - 26,
						y,
						labelX: viewBoxSize - 10,
						labelY: y + 4,
						labelAnchor: 'end'
					};
				}

				if (sideIndex === 2) {
					const x = viewBoxSize - quadPinRailInset - offset * step;
					return {
						pin,
						x,
						y: viewBoxSize - 26,
						labelX: x,
						labelY: viewBoxSize - 6,
						labelAnchor: 'middle'
					};
				}

				const y = viewBoxSize - quadPinRailInset - offset * step;
				return {
					pin,
					x: 26,
					y,
					labelX: 10,
					labelY: y + 4,
					labelAnchor: 'start'
				};
			}

			if (sideIndex === 0) {
				const y = quadPinRailInset + offset * step;
				return {
					pin,
					x: 26,
					y,
					labelX: 10,
					labelY: y + 4,
					labelAnchor: 'start'
				};
			}

			if (sideIndex === 1) {
				const x = quadPinRailInset + offset * step;
				return {
					pin,
					x,
					y: viewBoxSize - 26,
					labelX: x,
					labelY: viewBoxSize - 6,
					labelAnchor: 'middle'
				};
			}

			if (sideIndex === 2) {
				const y = viewBoxSize - quadPinRailInset - offset * step;
				return {
					pin,
					x: viewBoxSize - 26,
					y,
					labelX: viewBoxSize - 10,
					labelY: y + 4,
					labelAnchor: 'end'
				};
			}

			const x = viewBoxSize - quadPinRailInset - offset * step;
			return {
				pin,
				x,
				y: 26,
				labelX: x,
				labelY: 14,
				labelAnchor: 'middle'
			};
		});
	}

	function createDualRowPins(rows: PinRow[], rowPinCount: number): VisualPin[] {
		return rows.map((pin, index) => {
			const half = rowPinCount;
			const span = viewBoxSize - dualRowPinRailInset * 2;
			const step = half > 1 ? span / (half - 1) : 0;

			if (index < half) {
				const y = dualRowPinRailInset + index * step;
				return {
					pin,
					x: 40,
					y,
					labelX: 18,
					labelY: y + 4,
					labelAnchor: 'start'
				};
			}

			const y = dualRowPinRailInset + (rows.length - index - 1) * step;
			return {
				pin,
				x: viewBoxSize - 40,
				y,
				labelX: viewBoxSize - 18,
				labelY: y + 4,
				labelAnchor: 'end'
			};
		});
	}

	function parseBgaCoordinate(value: string) {
		const match = /^([A-Z]+)(\d+)$/i.exec(value.trim());

		if (!match) {
			return null;
		}

		let rowIndex = 0;
		for (const character of match[1].toUpperCase()) {
			rowIndex = rowIndex * 26 + (character.charCodeAt(0) - 64);
		}

		return {
			rowIndex: rowIndex - 1,
			rowLabel: match[1].toUpperCase(),
			column: Number(match[2])
		};
	}

	function createBgaLayout(rows: PinRow[]) {
		const parsedPins = rows
			.map((pin) => {
				const coordinate = parseBgaCoordinate(pin.packageNumber);
				return coordinate ? { pin, coordinate } : null;
			})
			.filter(
				(
					candidate
				): candidate is {
					pin: PinRow;
					coordinate: NonNullable<ReturnType<typeof parseBgaCoordinate>>;
				} => !!candidate
			);

		if (parsedPins.length === 0) {
			return {
				pins: [] as VisualPin[],
				rowLabels: [] as AxisLabel[],
				columnLabels: [] as AxisLabel[]
			};
		}

		const rowEntries = [
			...new Map(
				parsedPins.map(({ coordinate }) => [coordinate.rowIndex, coordinate.rowLabel])
			).entries()
		].sort((left, right) => left[0] - right[0]);
		const columns = [...new Set(parsedPins.map(({ coordinate }) => coordinate.column))].sort(
			(left, right) => left - right
		);
		const gridSize = viewBoxSize - bgaGridInset * 2;
		const stepX = columns.length > 1 ? gridSize / (columns.length - 1) : 0;
		const stepY = rowEntries.length > 1 ? gridSize / (rowEntries.length - 1) : 0;
		const rowPositionByIndex = new Map(rowEntries.map(([rowIndex], index) => [rowIndex, index]));
		const columnPositionByValue = new Map(columns.map((column, index) => [column, index]));
		const radius = Math.max(3.4, Math.min(6.4, Math.min(stepX || 12, stepY || 12) * 0.28));

		return {
			pins: parsedPins.map(({ pin, coordinate }) => ({
				pin,
				x: bgaGridInset + (columnPositionByValue.get(coordinate.column) ?? 0) * stepX,
				y: bgaGridInset + (rowPositionByIndex.get(coordinate.rowIndex) ?? 0) * stepY,
				labelX: 0,
				labelY: 0,
				labelAnchor: 'middle',
				radius
			})),
			rowLabels: rowEntries.map(([, rowLabel], index) => ({
				value: rowLabel,
				x: bgaGridInset - 20,
				y: bgaGridInset + index * stepY + 4
			})),
			columnLabels: columns.map((column, index) => ({
				value: String(column),
				x: bgaGridInset + index * stepX,
				y: bgaGridInset - 16
			}))
		};
	}

	$: bgaLayout = createBgaLayout(pins);

	$: visualPins = (() => {
		if (!packageDefinition) {
			return [] as VisualPin[];
		}

		if (packageDefinition.kind === 'quad') {
			return createQuadPins(
				pins,
				packageDefinition.pinsPerSide ?? Math.ceil(pins.length / 4),
				packageDefinition.numbering
			);
		}

		if (packageDefinition.kind === 'bga') {
			return bgaLayout.pins;
		}

		return createDualRowPins(pins, packageDefinition.rowPinCount ?? Math.ceil(pins.length / 2));
	})();

	function selectPin(pinId: string) {
		dispatch('selectpin', { pinId });
	}

	function handleKeyDown(event: KeyboardEvent, pinId: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectPin(pinId);
		}
	}

	function getPinCaption(pin: PinRow) {
		return pin.label || pin.assignedLabel || pin.name;
	}
</script>

{#if packageDefinition}
	<svg
		viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
		class="package-diagram"
		aria-label="MCU package visualizer"
	>
		{#if packageDefinition.kind === 'quad'}
			<rect x="108" y="108" width="204" height="204" rx="24" class="package-body" />
			<circle cx="130" cy="130" r="8" class="package-marker" />
		{:else if packageDefinition.kind === 'dual-row'}
			<rect x="112" y="64" width="196" height="292" rx="18" class="package-body" />
			<circle cx="160" cy="86" r="7" class="package-marker" />
		{:else}
			<rect x="84" y="84" width="252" height="252" rx="28" class="package-body" />
			<circle cx="106" cy="106" r="7" class="package-marker" />
		{/if}

		{#if packageDefinition.kind === 'bga'}
			{#each bgaLayout.columnLabels as label}
				<text x={label.x} y={label.y} text-anchor="middle" class="package-axis-label">
					{label.value}
				</text>
			{/each}

			{#each bgaLayout.rowLabels as label}
				<text x={label.x} y={label.y} text-anchor="middle" class="package-axis-label">
					{label.value}
				</text>
			{/each}

			<text x="210" y="362" text-anchor="middle" class="package-label"
				>{packageDefinition.bodyLabel}</text
			>
			<text x="210" y="386" text-anchor="middle" class="package-subtitle"
				>{packageDefinition.name}</text
			>
		{:else}
			<text x="210" y="202" text-anchor="middle" class="package-label"
				>{packageDefinition.bodyLabel}</text
			>
			<text x="210" y="226" text-anchor="middle" class="package-subtitle"
				>{packageDefinition.name}</text
			>
		{/if}

		{#each visualPins as visualPin}
			<g
				role="button"
				tabindex="0"
				class:pin-group--focused={visualPin.pin.id === focusedPinId}
				on:click={() => selectPin(visualPin.pin.id)}
				on:keydown={(event) => handleKeyDown(event, visualPin.pin.id)}
			>
				<circle
					cx={visualPin.x}
					cy={visualPin.y}
					r={visualPin.radius ?? 8.5}
					class="pin-dot"
					style:fill={visualPin.pin.color ?? 'var(--theme-bg-secondary)'}
				/>
				{#if packageDefinition.kind !== 'bga'}
					<text
						x={visualPin.labelX}
						y={visualPin.labelY}
						text-anchor={visualPin.labelAnchor}
						class="pin-number"
					>
						{visualPin.pin.packageNumber}
					</text>
				{/if}
				{#if visualPin.pin.id === focusedPinId}
					<text
						x={packageDefinition.kind === 'bga' ? 210 : visualPin.x}
						y={packageDefinition.kind === 'bga' ? 406 : visualPin.y + 24}
						text-anchor="middle"
						class="pin-caption"
					>
						{packageDefinition.kind === 'bga'
							? `${visualPin.pin.packageNumber} ${getPinCaption(visualPin.pin)}`
							: getPinCaption(visualPin.pin)}
					</text>
				{/if}
			</g>
		{/each}
	</svg>
{:else}
	<div class="package-empty">No package loaded.</div>
{/if}

<style>
	.package-diagram {
		width: 100%;
		height: auto;
		background: var(
			--pinmux-surface,
			color-mix(in srgb, var(--theme-bg-primary) 88%, var(--theme-bg-secondary))
		);
		border-radius: 1.5rem;
		border: 1px solid
			var(--pinmux-divider, color-mix(in srgb, var(--theme-highlight) 14%, transparent));
	}

	.package-body {
		fill: color-mix(in srgb, var(--theme-bg-primary) 80%, var(--theme-bg-secondary));
		stroke: color-mix(in srgb, var(--theme-highlight) 18%, transparent);
		stroke-width: 2;
	}

	.package-marker {
		fill: color-mix(in srgb, #ff8f00 76%, white);
	}

	.package-label {
		font-size: 1.2rem;
		font-weight: 700;
		fill: var(--theme-text-primary);
	}

	.package-subtitle {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		fill: var(--theme-text-secondary);
	}

	.package-axis-label {
		font-size: 0.56rem;
		font-weight: 700;
		fill: var(--theme-text-secondary);
	}

	.pin-dot {
		stroke: color-mix(in srgb, black 35%, transparent);
		stroke-width: 2;
	}

	.pin-group--focused .pin-dot {
		stroke: color-mix(in srgb, white 84%, var(--theme-highlight));
	}

	.pin-number {
		font-size: 0.5rem;
		font-weight: 700;
		fill: var(--theme-text-primary);
	}

	.pin-caption {
		font-size: 0.6rem;
		fill: var(--theme-text-secondary);
	}

	.package-empty {
		padding: 2rem;
		border-radius: 1rem;
		background: var(
			--pinmux-surface-muted,
			color-mix(in srgb, var(--theme-bg-secondary) 78%, var(--theme-bg-primary))
		);
		text-align: center;
		color: var(--theme-text-secondary);
	}
</style>
