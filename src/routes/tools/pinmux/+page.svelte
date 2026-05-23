<script lang="ts">
	import { onDestroy, tick } from 'svelte';

	import PackageVisualizer from '$lib/components/pinmux/PackageVisualizer.svelte';
	import { pinOverrideModeValues, type PinOverrideMode } from '$lib/pinmux/model';
	import { createPinmuxStore } from '$lib/pinmux/stores';

	const {
		activeDefinition,
		activePackage,
		definitionOptions,
		project,
		projectName,
		peripheralRows,
		pinRows,
		focusedPinId,
		solveDiagnostics,
		selectDefinition,
		setProjectName,
		togglePeripheral,
		setPeripheralRoutingOption,
		setPeripheralSignalEnabled,
		setPinOverrideMode,
		setPinLabel,
		focusPin,
		importDefinitionJson,
		exportActiveDefinitionJson,
		importProjectJson,
		exportProjectJson,
		exportCsv,
		destroy
	} = createPinmuxStore();

	onDestroy(destroy);

	let projectFileInput: HTMLInputElement | null = null;
	let definitionFileInput: HTMLInputElement | null = null;

	const overrideModeOptions = pinOverrideModeValues.map((value) => ({
		value,
		label: value.replace(/-/g, ' ')
	}));
	let pinRowElements: Record<string, HTMLDivElement | undefined> = {};
	let pinOverrideElements: Record<string, HTMLSelectElement | undefined> = {};
	let pinLabelElements: Record<string, HTMLInputElement | undefined> = {};

	function slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function downloadText(filename: string, content: string, type = 'application/json') {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');

		anchor.href = url;
		anchor.download = filename;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	function triggerProjectImport() {
		projectFileInput?.click();
	}

	function triggerDefinitionImport() {
		definitionFileInput?.click();
	}

	async function handleProjectImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		importProjectJson(await file.text());
		input.value = '';
	}

	async function handleDefinitionImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		importDefinitionJson(await file.text());
		input.value = '';
	}

	function handleExportProject() {
		downloadText(`${slugify($projectName)}.pinmux.json`, exportProjectJson());
	}

	function handleExportDefinition() {
		const json = exportActiveDefinitionJson();

		if (!json || !$activeDefinition) {
			return;
		}

		downloadText(`${slugify($activeDefinition.id)}.mcu.json`, json);
	}

	function handleExportCsv() {
		downloadText(`${slugify($projectName)}.csv`, exportCsv(), 'text/csv;charset=utf-8');
	}

	async function focusPinEditor(pinId: string) {
		focusPin(pinId);
		await tick();

		const pinRow = $pinRows.find((candidate) => candidate.id === pinId) ?? null;
		const rowElement = pinRowElements[pinId];
		const prefersLabel = !!pinRow?.label.trim();
		const preferredTarget = prefersLabel ? pinLabelElements[pinId] : pinOverrideElements[pinId];
		const fallbackTarget = prefersLabel ? pinOverrideElements[pinId] : pinLabelElements[pinId];
		const target = preferredTarget ?? fallbackTarget ?? null;

		rowElement?.scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});

		target?.focus({ preventScroll: true });

		if (target instanceof HTMLInputElement) {
			target.select();
		}
	}
</script>

<svelte:head>
	<title>Pinmux Planner</title>
</svelte:head>

<input
	bind:this={projectFileInput}
	type="file"
	accept="application/json,.json"
	hidden
	on:change={handleProjectImport}
/>
<input
	bind:this={definitionFileInput}
	type="file"
	accept="application/json,.json"
	hidden
	on:change={handleDefinitionImport}
/>

<section class="page-shell">
	<header class="hero-card panel-card">
		<div class="hero-copy">
			<p class="eyebrow">Pinmux Planner</p>
			<h1>Peripheral Pin Mapping Tool</h1>
			<p class="lede">
				Select a device, reserve GPIOs, route peripherals, and inspect the package footprint.
				Project JSON, MCU JSON, and CSV export are available from this workspace.
			</p>
		</div>

		<div class="hero-controls">
			<label class="field">
				<span>MCU Definition</span>
				<div class="field-inline-row">
					<select
						value={$project.selectedDefinitionId ?? ''}
						on:change={(event) =>
							selectDefinition((event.currentTarget as HTMLSelectElement).value)}
					>
						{#each $definitionOptions as option}
							<option value={option.id}>{option.label}</option>
						{/each}
					</select>

					<div class="action-pill action-pill--dual" role="group" aria-label="MCU JSON actions">
						<button
							type="button"
							class="action-pill__icon-button"
							aria-label="Import MCU JSON"
							title="Import MCU JSON"
							on:click={triggerDefinitionImport}
						>
							<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 15V4" />
								<path d="M8.5 7.5 12 4l3.5 3.5" />
								<path d="M5 14.5v3A1.5 1.5 0 0 0 6.5 19h11A1.5 1.5 0 0 0 19 17.5v-3" />
							</svg>
						</button>
						<span class="action-pill__separator" aria-hidden="true"></span>
						<button
							type="button"
							class="action-pill__icon-button"
							aria-label="Export MCU JSON"
							title="Export MCU JSON"
							on:click={handleExportDefinition}
						>
							<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
								<path d="M12 9v11" />
								<path d="M8.5 16.5 12 20l3.5-3.5" />
								<path d="M5 9.5v-3A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v3" />
							</svg>
						</button>
						<span class="action-pill__type">JSON</span>
					</div>
				</div>
			</label>

			<div class="hero-divider" aria-hidden="true"></div>

			<label class="field field--name">
				<span>Project Name</span>
				<input
					type="text"
					value={$projectName}
					on:input={(event) => setProjectName((event.currentTarget as HTMLInputElement).value)}
				/>
			</label>

			<div class="hero-actions">
				<div class="action-pill action-pill--dual" role="group" aria-label="Project JSON actions">
					<button
						type="button"
						class="action-pill__icon-button"
						aria-label="Import Project JSON"
						title="Import Project JSON"
						on:click={triggerProjectImport}
					>
						<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 15V4" />
							<path d="M8.5 7.5 12 4l3.5 3.5" />
							<path d="M5 14.5v3A1.5 1.5 0 0 0 6.5 19h11A1.5 1.5 0 0 0 19 17.5v-3" />
						</svg>
					</button>
					<span class="action-pill__separator" aria-hidden="true"></span>
					<button
						type="button"
						class="action-pill__icon-button"
						aria-label="Export Project JSON"
						title="Export Project JSON"
						on:click={handleExportProject}
					>
						<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 9v11" />
							<path d="M8.5 16.5 12 20l3.5-3.5" />
							<path d="M5 9.5v-3A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v3" />
						</svg>
					</button>
					<span class="action-pill__type">JSON</span>
				</div>

				<div class="action-pill" role="group" aria-label="CSV export action">
					<button
						type="button"
						class="action-pill__icon-button"
						aria-label="Export CSV"
						title="Export CSV"
						on:click={handleExportCsv}
					>
						<svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 9v11" />
							<path d="M8.5 16.5 12 20l3.5-3.5" />
							<path d="M5 9.5v-3A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v3" />
						</svg>
					</button>
					<span class="action-pill__type">CSV</span>
				</div>
			</div>
		</div>
	</header>

	<div class="workspace-grid">
		<aside class="panel-card panel-column">
			<div class="panel-head">
				<h2>Peripherals</h2>
				<p class="panel-meta">{$peripheralRows.length} entries</p>
			</div>

			<div class="panel-scroll">
				{#if $peripheralRows.length === 0}
					<p class="empty-state">No peripherals are available in the active definition.</p>
				{/if}

				{#each $peripheralRows as row}
					<article
						class:card--focused={row.isFocused}
						class:peripheral-card--disabled={!row.enabled && !row.canEnable}
						class="peripheral-card"
					>
						<div class="peripheral-topline">
							<label class="toggle-row">
								<input
									type="checkbox"
									checked={row.enabled}
									disabled={!row.enabled && !row.canEnable}
									on:change={(event) =>
										togglePeripheral(row.id, (event.currentTarget as HTMLInputElement).checked)}
								/>
								<div>
									<strong>{row.label}</strong>
									<span>{row.family}</span>
								</div>
							</label>
						</div>

						<p class="peripheral-summary">{row.signalSummary}</p>
						<p class="peripheral-description">{row.description}</p>

						{#if row.enabled && row.routingOptions.length > 0}
							<label class="field">
								<span>Remap / Route</span>
								<select
									value={row.activeRoutingOptionId ?? ''}
									on:change={(event) =>
										setPeripheralRoutingOption(
											row.id,
											(event.currentTarget as HTMLSelectElement).value || null
										)}
								>
									{#each row.routingOptions as option}
										<option
											value={option.id}
											disabled={!row.availableRoutingOptionIds.includes(option.id)}
										>
											{option.label}
										</option>
									{/each}
								</select>
							</label>
						{/if}

						{#if row.enabled && row.signals.length > 0}
							<div class="signal-field">
								<span>Signals</span>
								<div class="signal-toggle-list">
									{#each row.signals as signal}
										<label
											class:signal-toggle--enabled={signal.enabled}
											class:signal-toggle--disabled={!signal.enabled && !signal.canEnable}
											class:signal-toggle--required={signal.required}
											class="signal-toggle"
											title={signal.disabledReason ?? undefined}
										>
											<input
												type="checkbox"
												checked={signal.enabled}
												disabled={signal.required || (!signal.enabled && !signal.canEnable)}
												on:change={(event) =>
													setPeripheralSignalEnabled(
														row.id,
														signal.id,
														(event.currentTarget as HTMLInputElement).checked
													)}
											/>
											<span>{signal.label}</span>
											<small
												>{signal.required
													? 'required'
													: !signal.canEnable
														? 'unavailable'
														: signal.defaultEnabled
															? 'default on'
															: 'default off'}</small
											>
										</label>
									{/each}
								</div>
							</div>
						{/if}

						{#if row.enabled || !row.canEnable}
							<p class:hint--error={!!row.disabledReason} class="hint">
								{#if row.disabledReason}
									{row.disabledReason}
								{:else if row.enabled && row.activeSignalCount === 0}
									No signals are active yet, so this peripheral is not claiming any pins.
								{:else if row.choiceKind === 'explicit'}
									User-preferred route.
								{:else}
									Solver may reroute this peripheral to avoid collisions.
								{/if}
							</p>
						{/if}
					</article>
				{/each}
			</div>
		</aside>

		<section class="panel-card panel-column">
			<div class="panel-head">
				<h2>GPIO Pins</h2>
				<p class="panel-meta">{$pinRows.length} physical pins</p>
			</div>

			<div class="pin-grid pin-grid--header">
				<span>GPIO</span>
				<span>Pkg Pin</span>
				<span>Assignment</span>
				<span>Override</span>
				<span>Label</span>
			</div>

			<div class="panel-scroll pin-rows">
				{#each $pinRows as row}
					<div
						bind:this={pinRowElements[row.id]}
						class:pin-row--focused={row.isFocused}
						class="pin-grid pin-row"
					>
						<button
							type="button"
							class="pin-focus pin-focus--gpio"
							aria-label={`Focus ${row.name} at package pin ${row.packageNumber}`}
							on:click={() => void focusPinEditor(row.id)}
						>
							<span>{row.name}</span>
							{#if row.id !== row.name}
								<small>{row.id}</small>
							{/if}
						</button>

						<div class="pin-package">{row.packageNumber}</div>

						<div class="pin-assignment">
							<span class="color-dot" style:background={row.color ?? 'transparent'}></span>
							<div>
								<strong>{row.assignedLabel}</strong>
								{#if row.af}
									<span>{row.af}</span>
								{/if}
							</div>
						</div>

						{#if row.isStatic}
							<div class="pin-static-badge">Static</div>
							<div class="pin-static-note">Not user configurable</div>
						{:else}
							<select
								bind:this={pinOverrideElements[row.id]}
								value={row.overrideMode}
								on:change={(event) =>
									setPinOverrideMode(
										row.id,
										(event.currentTarget as HTMLSelectElement).value as PinOverrideMode
									)}
							>
								{#each overrideModeOptions as option}
									<option
										value={option.value}
										disabled={option.value !== 'auto' && !row.supportedModes.includes(option.value)}
									>
										{option.label}
									</option>
								{/each}
							</select>

							<input
								bind:this={pinLabelElements[row.id]}
								type="text"
								placeholder="Purpose / label"
								value={row.label}
								on:input={(event) =>
									setPinLabel(row.id, (event.currentTarget as HTMLInputElement).value)}
							/>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<aside class="panel-card panel-column">
			<div class="panel-head">
				<h2>Package View</h2>
				<p class="panel-meta">{$activePackage?.name ?? 'No package'}</p>
			</div>

			<PackageVisualizer
				packageDefinition={$activePackage}
				pins={$pinRows}
				focusedPinId={$focusedPinId}
				on:selectpin={(event) => void focusPinEditor(event.detail.pinId)}
			/>

			{#if $activeDefinition}
				<div class="definition-note">
					<h3>{$activeDefinition.vendor} {$activeDefinition.name}</h3>
					<p>{$activeDefinition.description}</p>
				</div>
			{/if}

			<div class="diagnostics">
				<h3>Diagnostics</h3>
				{#if $solveDiagnostics.length === 0}
					<p class="empty-state">No diagnostics yet.</p>
				{/if}

				{#each $solveDiagnostics as diagnostic}
					<p class={`diagnostic diagnostic--${diagnostic.level}`}>{diagnostic.message}</p>
				{/each}
			</div>
		</aside>
	</div>
</section>

<style>
	:global(:root) {
		--pinmux-accent: #2d8f85;
		--pinmux-accent-soft: color-mix(in srgb, var(--pinmux-accent) 12%, var(--theme-bg-secondary));
		--pinmux-warm: #d67f2d;
		--pinmux-surface: color-mix(in srgb, var(--theme-bg-primary) 88%, var(--theme-bg-secondary));
		--pinmux-surface-muted: color-mix(
			in srgb,
			var(--theme-bg-secondary) 78%,
			var(--theme-bg-primary)
		);
		--pinmux-surface-elevated: color-mix(
			in srgb,
			var(--theme-bg-secondary) 92%,
			var(--theme-bg-primary)
		);
		--pinmux-divider: color-mix(in srgb, var(--theme-highlight) 14%, transparent);
		--pinmux-panel-border: color-mix(in srgb, var(--theme-highlight) 14%, transparent);
		--pinmux-shadow: color-mix(in srgb, black 12%, transparent);
	}

	.page-shell {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.hero-card,
	.panel-card {
		background: var(--pinmux-surface);
		border: 1px solid var(--pinmux-panel-border);
		border-radius: 1.5rem;
		box-shadow: 0 18px 36px var(--pinmux-shadow);
	}

	.hero-card {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
		gap: 1.5rem;
		padding: 1.4rem;
	}

	.hero-copy h1,
	.panel-head h2,
	.definition-note h3,
	.diagnostics h3 {
		margin: 0;
		font-family: 'Georgia', 'Times New Roman', serif;
	}

	.hero-copy h1 {
		font-size: clamp(1.8rem, 2.6vw, 2.8rem);
	}

	.lede {
		max-width: 65ch;
		margin: 0.75rem 0 0;
		color: var(--theme-txt-secondary);
		line-height: 1.6;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 0.72rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--pinmux-warm) 78%, var(--theme-txt-secondary));
	}

	.hero-controls {
		display: grid;
		gap: 0.9rem;
		align-content: start;
	}

	.hero-divider {
		height: 1px;
		width: 100%;
		background: var(--pinmux-divider);
	}

	.field {
		display: grid;
		gap: 0.35rem;
	}

	.field-inline-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: stretch;
	}

	.field-inline-row select {
		flex: 1 1 12rem;
		min-width: 0;
	}

	.field span {
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--theme-txt-secondary);
	}

	.field select,
	.field input,
	.pin-grid select,
	.pin-grid input,
	button {
		font: inherit;
	}

	.field select,
	.field input,
	.pin-grid select,
	.pin-grid input {
		border-radius: 0.9rem;
		border: 1px solid var(--pinmux-divider);
		padding: 0.75rem 0.9rem;
		background: var(--pinmux-surface-elevated);
		color: var(--theme-txt-primary);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
	}

	button {
		border: 1px solid var(--pinmux-divider);
		border-radius: 999px;
		padding: 0.72rem 1rem;
		background: var(--pinmux-surface-elevated);
		color: var(--theme-txt-primary);
		cursor: pointer;
		transition:
			transform 120ms ease,
			background-color 120ms ease,
			border-color 120ms ease;
	}

	button:hover {
		transform: translateY(-1px);
		background: color-mix(in srgb, var(--pinmux-surface-elevated) 84%, var(--pinmux-accent) 16%);
		border-color: color-mix(in srgb, var(--pinmux-accent) 28%, transparent);
	}

	button:focus-visible,
	.field select:focus-visible,
	.field input:focus-visible,
	.pin-grid select:focus-visible,
	.pin-grid input:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--pinmux-accent) 52%, transparent);
		outline-offset: 2px;
	}

	.action-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		border-radius: 999px;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-elevated);
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
		background: transparent;
		color: var(--theme-txt-primary);
	}

	.action-pill__separator {
		width: 1px;
		height: 75%;
		border-radius: 999px;
		background: var(--pinmux-divider);
	}

	.action-pill__type {
		display: inline-flex;
		align-items: center;
		padding: 0 0.78rem 0 0.45rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-txt-secondary);
	}

	.action-pill__icon-button:hover {
		transform: none;
		border-color: transparent;
		background: color-mix(in srgb, var(--pinmux-accent) 12%, transparent);
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

	.pin-focus {
		background: var(--pinmux-surface-elevated);
		color: var(--theme-txt-primary);
		border: 1px solid var(--pinmux-divider);
	}

	.pin-focus--gpio {
		display: grid;
		justify-items: start;
		gap: 0.12rem;
	}

	.pin-focus--gpio span {
		font-weight: 700;
	}

	.pin-focus--gpio small {
		font-size: 0.72rem;
		color: var(--theme-txt-secondary);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: center;
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr) minmax(18rem, 21rem);
		gap: 1rem;
		align-items: start;
	}

	.panel-column {
		padding: 1rem;
		display: grid;
		gap: 0.9rem;
		min-height: 72vh;
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: end;
	}

	.panel-meta {
		margin: 0;
		font-size: 0.85rem;
		color: var(--theme-txt-secondary);
	}

	.panel-scroll {
		display: grid;
		gap: 0.75rem;
		overflow: auto;
		align-content: start;
	}

	.peripheral-card {
		padding: 0.9rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 12%, transparent);
		display: grid;
		gap: 0.65rem;
	}

	.peripheral-card--disabled {
		opacity: 0.62;
	}

	.card--focused,
	.pin-row--focused {
		border-color: color-mix(in srgb, var(--pinmux-accent) 62%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pinmux-accent) 32%, transparent);
	}

	.peripheral-topline,
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.toggle-row {
		flex: 1;
		justify-content: start;
	}

	.toggle-row input {
		margin: 0;
	}

	.toggle-row span,
	.peripheral-description,
	.hint,
	.empty-state,
	.pin-assignment span,
	.definition-note p {
		color: var(--theme-txt-secondary);
	}

	.peripheral-summary,
	.peripheral-description,
	.hint,
	.empty-state,
	.definition-note p {
		margin: 0;
		line-height: 1.5;
	}

	.signal-field {
		display: grid;
		gap: 0.45rem;
	}

	.signal-field > span {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--theme-txt-secondary);
	}

	.signal-toggle-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.signal-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-elevated);
		font-size: 0.88rem;
	}

	.signal-toggle input {
		margin: 0;
	}

	.signal-toggle small {
		color: var(--theme-txt-secondary);
		font-size: 0.72rem;
	}

	.signal-toggle--enabled {
		border-color: color-mix(in srgb, var(--pinmux-accent) 36%, transparent);
		background: color-mix(in srgb, var(--pinmux-accent) 14%, var(--pinmux-surface-elevated));
	}

	.signal-toggle--disabled {
		opacity: 0.56;
		border-style: dashed;
	}

	.signal-toggle--required {
		border-style: dashed;
	}

	.pin-static-badge,
	.pin-static-note {
		display: inline-flex;
		align-items: center;
		min-height: 2.5rem;
		padding: 0 0.8rem;
		border-radius: 0.85rem;
		background: var(--pinmux-surface-elevated);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 12%, transparent);
		color: var(--theme-txt-secondary);
		font-size: 0.9rem;
	}

	.hint--error,
	.diagnostic--error {
		color: #8f2416;
	}

	.pin-grid {
		display: grid;
		grid-template-columns:
			minmax(6.75rem, 0.9fr) 4.75rem minmax(11rem, 1.2fr) minmax(8rem, 0.85fr)
			minmax(10rem, 1fr);
		gap: 0.7rem;
		align-items: center;
	}

	.pin-grid--header {
		padding: 0 0.25rem 0.4rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-txt-secondary);
	}

	.pin-row {
		padding: 0.8rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 12%, transparent);
	}

	.pin-assignment {
		display: grid;
		gap: 0.2rem;
	}

	.pin-package {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.5rem;
		padding: 0 0.85rem;
		border-radius: 0.85rem;
		background: var(--pinmux-surface-elevated);
		border: 1px solid var(--pinmux-divider);
		font-weight: 700;
		color: var(--theme-txt-secondary);
	}

	.pin-assignment {
		grid-template-columns: auto 1fr;
		gap: 0.65rem;
		align-items: center;
	}

	.color-dot {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, black 15%, transparent);
	}

	.definition-note,
	.diagnostics {
		display: grid;
		gap: 0.5rem;
	}

	.diagnostic {
		margin: 0;
		padding: 0.75rem 0.85rem;
		border-radius: 0.9rem;
		background: var(--pinmux-surface-muted);
	}

	.diagnostic--info {
		color: var(--theme-txt-secondary);
	}

	.diagnostic--warning {
		color: #8a5300;
	}

	@media (max-width: 1100px) {
		.hero-card,
		.workspace-grid {
			grid-template-columns: 1fr;
		}

		.panel-column {
			min-height: auto;
		}
	}

	@media (max-width: 760px) {
		.pin-grid,
		.pin-grid--header {
			grid-template-columns: minmax(6.5rem, 1fr) 4.25rem;
		}

		.pin-grid--header span:nth-child(n + 3) {
			display: none;
		}

		.pin-row > :nth-child(n + 3) {
			grid-column: 1 / -1;
		}
	}
</style>
