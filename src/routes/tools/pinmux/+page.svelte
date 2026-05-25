<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';

	import ProjectShareDialog from '$lib/components/share/ProjectShareDialog.svelte';
	import PackageVisualizer from '$lib/components/pinmux/PackageVisualizer.svelte';
	import TransferActionPill from '$lib/components/pinmux/TransferActionPill.svelte';
	import { pinOverrideModeValues, type PinOverrideMode } from '$lib/pinmux/model';
	import {
		getRequiredShortShareUnavailableReason,
		isShortShareEligibleProjectJson
	} from '$lib/share/project-registry';
	import { createTemporaryShareLink } from '$lib/share/api';
	import { resolveSharedProjectFromUrl } from '$lib/share/load';
	import { TEMPORARY_SHARE_AVAILABILITY_MESSAGE } from '$lib/share/tools';
	import {
		buildCompressedProjectUrl,
		decodeCompressedProjectJson,
		encodeCompressedProjectJson,
		isShareUrlLarge
	} from '$lib/share/url';
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
		setPeripheralSignalRoutingOption,
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

	const shareTool = 'pinmux' as const;

	onDestroy(destroy);

	let projectFileInput: HTMLInputElement | null = null;
	let definitionFileInput: HTMLInputElement | null = null;
	let loadError = '';
	let shareStatus = '';
	let shareDialogOpen = false;
	let shareDialogUrl = '';
	let shareDialogStatus = '';
	let shareDialogShortUrl = '';
	let shareDialogShortUrlStatus = '';
	let shareDialogShortUrlEligible = false;
	let shareDialogShortUrlPending = false;

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

	function describeError(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function closeShareProjectDialog() {
		shareDialogOpen = false;
		shareDialogStatus = '';
		shareDialogShortUrl = '';
		shareDialogShortUrlStatus = '';
		shareDialogShortUrlPending = false;
	}

	function applyProjectJson(json: string, successMessage = ''): boolean {
		try {
			importProjectJson(json);
			loadError = '';
			shareStatus = successMessage;
			closeShareProjectDialog();
			return true;
		} catch (error) {
			loadError = describeError(error, 'Unable to load this Pinmux project.');
			shareStatus = '';
			return false;
		}
	}

	function getProjectJsonForShare(): string | null {
		try {
			return exportProjectJson();
		} catch (error) {
			loadError = describeError(error, 'Unable to serialize this Pinmux project for sharing.');
			shareStatus = '';
			return null;
		}
	}

	function configureShareDialog(projectJson: string) {
		shareDialogUrl = buildCompressedProjectUrl(
			encodeCompressedProjectJson(projectJson),
			window.location.href
		);
		shareDialogStatus = isShareUrlLarge(shareDialogUrl)
			? 'This compressed URL is still large and may exceed some browser limits.'
			: 'This compressed URL is ready to copy.';
		shareDialogShortUrl = '';
		shareDialogShortUrlEligible = isShortShareEligibleProjectJson(shareTool, projectJson);
		shareDialogShortUrlStatus = shareDialogShortUrlEligible
			? ''
			: getRequiredShortShareUnavailableReason(shareTool);
		shareDialogShortUrlPending = false;
	}

	async function openShareProjectDialog() {
		const projectJson = getProjectJsonForShare();

		if (!projectJson) {
			return;
		}

		try {
			configureShareDialog(projectJson);
			shareDialogOpen = true;
			loadError = '';
		} catch (error) {
			loadError = describeError(error, 'Unable to build a shareable Pinmux URL.');
			shareStatus = '';
			closeShareProjectDialog();
		}
	}

	async function createShortShareProjectUrl() {
		if (!shareDialogShortUrlEligible || shareDialogShortUrlPending) {
			return;
		}

		const projectJson = getProjectJsonForShare();

		if (!projectJson) {
			return;
		}

		if (!isShortShareEligibleProjectJson(shareTool, projectJson)) {
			shareDialogShortUrlEligible = false;
			shareDialogShortUrl = '';
			shareDialogShortUrlStatus = getRequiredShortShareUnavailableReason(shareTool);
			return;
		}

		shareDialogShortUrlPending = true;
		shareDialogShortUrlStatus = 'Creating temporary short URL...';

		try {
			const temporaryShare = await createTemporaryShareLink(shareTool, projectJson);

			shareDialogShortUrl = temporaryShare.url;
			shareDialogShortUrlStatus = `Temporary short URL ready. ${TEMPORARY_SHARE_AVAILABILITY_MESSAGE}`;
		} catch (error) {
			shareDialogShortUrl = '';
			shareDialogShortUrlStatus = describeError(
				error,
				'Unable to create a temporary Pinmux short URL.'
			);
		} finally {
			shareDialogShortUrlPending = false;
		}
	}

	async function loadProjectFromUrl(options: { quietIfMissing?: boolean } = {}): Promise<boolean> {
		try {
			const resolvedProject = await resolveSharedProjectFromUrl({
				currentUrl: new URL(window.location.href),
				tool: shareTool,
				decodeLongShare: (encodedProject) =>
					decodeCompressedProjectJson(encodedProject, {
						unsupportedFormatMessage: 'This Pinmux share URL uses an unsupported format.',
						invalidShareMessage: 'The shared Pinmux project URL is invalid or truncated.'
					})
			});

			if (!resolvedProject) {
				if (!options.quietIfMissing) {
					loadError = 'No shared Pinmux project was found in the current URL.';
				}

				shareStatus = '';
				return false;
			}

			return applyProjectJson(
				resolvedProject.projectJson,
				resolvedProject.source === 'short'
					? 'Loaded Pinmux project from temporary short URL.'
					: 'Loaded Pinmux project from shared URL.'
			);
		} catch (error) {
			loadError = describeError(error, 'Unable to load the shared Pinmux project.');
			shareStatus = '';
			return false;
		}
	}

	async function handleProjectImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		applyProjectJson(await file.text());
		input.value = '';
	}

	async function handleDefinitionImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		try {
			importDefinitionJson(await file.text());
			loadError = '';
			shareStatus = '';
		} catch (error) {
			loadError = describeError(error, 'Unable to load this MCU definition.');
			shareStatus = '';
		}
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

	function getRoutingLabel(
		routingOptions: Array<{ id: string; label: string }>,
		routingOptionId: string | null
	): string | null {
		if (!routingOptionId) {
			return null;
		}

		return routingOptions.find((option) => option.id === routingOptionId)?.label ?? routingOptionId;
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

	onMount(() => {
		void loadProjectFromUrl({ quietIfMissing: true });
	});
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

<ProjectShareDialog
	open={shareDialogOpen}
	longDescription="This link keeps the full Pinmux project inside the URL and works without the temporary server store."
	longUrl={shareDialogUrl}
	longStatus={shareDialogStatus}
	shortDescription={`This option stores a shorter URL on the server. ${TEMPORARY_SHARE_AVAILABILITY_MESSAGE}`}
	shortUrl={shareDialogShortUrl}
	shortStatus={shareDialogShortUrlStatus}
	shortEligible={shareDialogShortUrlEligible}
	shortPending={shareDialogShortUrlPending}
	on:close={closeShareProjectDialog}
	on:createshort={createShortShareProjectUrl}
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

					<TransferActionPill
						groupLabel="MCU JSON actions"
						formatLabel="JSON"
						importLabel="Import MCU JSON"
						exportLabel="Export MCU JSON"
						onImport={triggerDefinitionImport}
						onExport={handleExportDefinition}
					/>
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
				<TransferActionPill
					groupLabel="Project JSON actions"
					formatLabel="JSON"
					importLabel="Import Project JSON"
					exportLabel="Export Project JSON"
					onImport={triggerProjectImport}
					onExport={handleExportProject}
				/>

				<TransferActionPill
					groupLabel="CSV export action"
					formatLabel="CSV"
					exportLabel="Export CSV"
					onExport={handleExportCsv}
				/>

				<button type="button" class="action-button" on:click={openShareProjectDialog}>
					Share project as URL
				</button>
			</div>

			{#if shareStatus || loadError}
				<div class="hero-status-group">
					{#if shareStatus}
						<p class="hero-share-status">{shareStatus}</p>
					{/if}

					{#if loadError}
						<p class="error-banner">{loadError}</p>
					{/if}
				</div>
			{/if}
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
									value={row.choiceKind === 'explicit' ? (row.activeRoutingOptionId ?? '') : ''}
									on:change={(event) =>
										setPeripheralRoutingOption(
											row.id,
											(event.currentTarget as HTMLSelectElement).value || null
										)}
								>
									<option value="">Automatic</option>
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
											{#if row.routingOptions.length === 0 && signal.enabled && signal.routingOptions.length > 1}
												<select
													class="signal-route-select"
													value={signal.activeRoutingOptionId ?? ''}
													on:change={(event) =>
														setPeripheralSignalRoutingOption(
															row.id,
															signal.id,
															(event.currentTarget as HTMLSelectElement).value || null
														)}
												>
													<option value="">Automatic</option>
													{#each signal.routingOptions as option}
														<option
															value={option.id}
															disabled={!signal.availableRoutingOptionIds.includes(option.id)}
														>
															{option.label}
														</option>
													{/each}
												</select>
											{/if}
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
								{:else if row.activeRoutingOptionId}
									Solver currently uses {getRoutingLabel(
										row.routingOptions,
										row.activeRoutingOptionId
									)} and may reroute it to avoid collisions.
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

	<section class="panel-card guide-card" aria-labelledby="pinmux-guide-heading">
		<div class="panel-head guide-card__head">
			<div>
				<p class="eyebrow">Guide</p>
				<h2 id="pinmux-guide-heading">Using This Tool</h2>
			</div>
		</div>

		<div class="guide-grid">
			<article class="guide-block">
				<h3>Purpose</h3>
				<p>
					This planner helps you inspect MCU package pinouts, enable peripheral signal groups,
					reserve pins for GPIO use, and verify that a chosen routing is still solvable.
				</p>
			</article>

			<article class="guide-block">
				<h3>How To Use</h3>
				<p>
					Start by selecting an MCU definition, then enable the peripherals you need. Choose a route
					when multiple mappings exist, and use pin overrides only when a pin must stay in GPIO or
					analog mode. The package view and diagnostics panel update as the solver finds a valid
					arrangement.
				</p>
			</article>

			<article class="guide-block">
				<h3>Report Issues</h3>
				<p>
					If you find a bad pin mapping, missing device data, or solver behavior that looks wrong,
					please raise an issue on
					<a href="https://github.com/Mapy542/portfolio/issues" target="_blank" rel="noreferrer"
						>this repository</a
					>. I've used a variety of parsing methods to gather data programmatically from device
					datasheets. There may be parse errors, or just document ambiguities which lead to issues.
					Always validate your configuration against official resources before using it in a real
					design!
				</p>
			</article>
		</div>
	</section>
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
		--share-dialog-border: var(--pinmux-panel-border);
		--share-dialog-surface: var(--pinmux-surface);
		--share-dialog-shadow: var(--pinmux-shadow);
		--share-dialog-section-surface: var(--pinmux-surface-muted);
		--share-dialog-section-border: color-mix(in srgb, var(--theme-highlight) 12%, transparent);
		--share-dialog-eyebrow: color-mix(in srgb, var(--pinmux-warm) 78%, var(--theme-text-secondary));
		--share-dialog-field-border: var(--pinmux-divider);
		--share-dialog-field-surface: var(--pinmux-surface-elevated);
		--share-dialog-button-surface: var(--pinmux-surface-elevated);
		--share-dialog-button-border: var(--pinmux-divider);
		--share-dialog-button-primary-surface: color-mix(
			in srgb,
			var(--pinmux-accent) 18%,
			var(--pinmux-surface-elevated)
		);
		--share-dialog-button-primary-border: color-mix(in srgb, var(--pinmux-accent) 30%, transparent);
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
	.guide-block h3,
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
		color: var(--theme-text-secondary);
		line-height: 1.6;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 0.72rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--pinmux-warm) 78%, var(--theme-text-secondary));
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
		color: var(--theme-text-secondary);
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
		color: var(--theme-text-primary);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 4%, transparent);
	}

	button {
		border: 1px solid var(--pinmux-divider);
		border-radius: 999px;
		padding: 0.72rem 1rem;
		background: var(--pinmux-surface-elevated);
		color: var(--theme-text-primary);
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

	button:disabled {
		opacity: 0.56;
		cursor: not-allowed;
		transform: none;
	}

	button:disabled:hover {
		background: var(--pinmux-surface-elevated);
		border-color: var(--pinmux-divider);
	}

	button:focus-visible,
	.field select:focus-visible,
	.field input:focus-visible,
	.pin-grid select:focus-visible,
	.pin-grid input:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--pinmux-accent) 52%, transparent);
		outline-offset: 2px;
	}

	.pin-focus {
		background: var(--pinmux-surface-elevated);
		color: var(--theme-text-primary);
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
		color: var(--theme-text-secondary);
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: center;
	}

	.hero-status-group {
		display: grid;
		gap: 0.55rem;
	}

	.hero-share-status,
	.error-banner {
		margin: 0;
		padding: 0.8rem 0.95rem;
		border-radius: 0.95rem;
	}

	.hero-share-status {
		background: color-mix(in srgb, var(--pinmux-accent) 12%, var(--pinmux-surface-elevated));
		border: 1px solid color-mix(in srgb, var(--pinmux-accent) 26%, transparent);
		color: var(--theme-text-primary);
	}

	.error-banner {
		background: color-mix(in srgb, #8f2416 10%, var(--pinmux-surface-elevated));
		border: 1px solid color-mix(in srgb, #8f2416 24%, transparent);
		color: #8f2416;
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr) minmax(18rem, 21rem);
		gap: 1rem;
		align-items: start;
	}

	.guide-card {
		padding: 1.15rem;
		display: grid;
		gap: 0.9rem;
	}

	.guide-card__head {
		align-items: start;
	}

	.guide-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.guide-block {
		display: grid;
		gap: 0.45rem;
		padding: 0.95rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 12%, transparent);
	}

	.guide-block p {
		margin: 0;
		line-height: 1.6;
		color: var(--theme-text-secondary);
	}

	.guide-block a {
		color: var(--pinmux-accent);
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
		color: var(--theme-text-secondary);
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
		color: var(--theme-text-secondary);
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
		color: var(--theme-text-secondary);
	}

	.signal-toggle-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.signal-toggle {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
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
		color: var(--theme-text-secondary);
		font-size: 0.72rem;
	}

	.signal-route-select {
		flex: 1 1 100%;
		min-width: 0;
		margin-top: 0.15rem;
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
		color: var(--theme-text-secondary);
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
		color: var(--theme-text-secondary);
	}

	.pin-row {
		padding: 0.8rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid color-mix(in srgb, var(--theme-highlight) 12%, transparent);
		color: var(--theme-text-primary);
	}

	.pin-assignment {
		display: grid;
		gap: 0.2rem;
	}

	.pin-assignment strong {
		color: var(--theme-text-primary);
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
		color: var(--theme-text-secondary);
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
		color: var(--theme-text-secondary);
	}

	.diagnostic--warning {
		color: #8a5300;
	}

	@media (max-width: 1100px) {
		.hero-card,
		.workspace-grid {
			grid-template-columns: 1fr;
		}

		.guide-grid {
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
