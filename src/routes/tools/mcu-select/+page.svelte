<script lang="ts">
	import { onMount } from 'svelte';

	import DoubleRangeSlider from '$lib/components/mcu-select/DoubleRangeSlider.svelte';
	import TransferActionPill from '$lib/components/pinmux/TransferActionPill.svelte';
	import ProjectShareDialog from '$lib/components/share/ProjectShareDialog.svelte';
	import {
		mcuSelectEthernetMacInterfaceValues,
		mcuSelectEthernetSpeedValues
	} from '$lib/mcu-select/model';
	import { packageKindValues, serializeMcuDefinitionDocument } from '$lib/pinmux/model';
	import { createMcuSelectStore } from '$lib/mcu-select/stores';
	import { createTemporaryShareLink } from '$lib/share/api';
	import {
		getRequiredShortShareUnavailableReason,
		isShortShareEligibleProjectJson
	} from '$lib/share/project-registry';
	import { resolveSharedProjectFromUrl } from '$lib/share/load';
	import { TEMPORARY_SHARE_AVAILABILITY_MESSAGE } from '$lib/share/tools';
	import {
		buildCompressedProjectUrl,
		decodeCompressedProjectJson,
		encodeCompressedProjectJson,
		isShareUrlLarge
	} from '$lib/share/url';

	const {
		catalog,
		groupDefinitions,
		matchSections,
		project,
		projectName,
		selectedResultId,
		setProjectName,
		setShowCloseMatches,
		setRequirementMinimum,
		setMinPinCount,
		setMaxPinCount,
		setEthernetPhyMinimum,
		setEthernetMacMinimum,
		setEthernetPhySpeedEnabled,
		setEthernetMacSpeedEnabled,
		setEthernetMacInterfaceEnabled,
		setPackageKindExcluded,
		clearAllFilters,
		toggleFavorite,
		importDefinitionJson,
		importProjectJson,
		exportProjectJson,
		selectResult,
		buildPinmuxUrlForResult
	} = createMcuSelectStore();

	const shareTool = 'mcu-select' as const;
	const categoryLabels = {
		connectivity: 'Connectivity',
		serial: 'Serial',
		bus: 'Bus',
		memory: 'Memory',
		timer: 'Timer',
		analog: 'Analog',
		audio: 'Audio',
		display: 'Display',
		motor: 'Motor',
		other: 'Other'
	} as const;
	const ethernetSpeedLabels = {
		'10m': '10M',
		'10-100': '10/100M',
		'1g': '1G'
	} as const;
	const ethernetInterfaceLabels = {
		mii: 'MII',
		rmii: 'RMII',
		rgmii: 'RGMII',
		sgmii: 'SGMII'
	} as const;

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

	function describeError(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	function formatPackageKindLabel(value: string) {
		return value.replace(/-/g, ' ');
	}

	function formatOutcome(
		outcome: (typeof $matchSections.exact)[number]['criteriaOutcomes'][number]
	) {
		return `${outcome.groupLabel} ${outcome.availableCount}/${outcome.requiredCount}`;
	}

	function triggerProjectImport() {
		projectFileInput?.click();
	}

	function triggerDefinitionImport() {
		definitionFileInput?.click();
	}

	function applyProjectJson(json: string, successMessage = ''): boolean {
		try {
			importProjectJson(json);
			loadError = '';
			shareStatus = successMessage;
			closeShareProjectDialog();
			return true;
		} catch (error) {
			loadError = describeError(error, 'Unable to load this MCU Select search.');
			shareStatus = '';
			return false;
		}
	}

	function getProjectJsonForShare(): string | null {
		try {
			return exportProjectJson();
		} catch (error) {
			loadError = describeError(error, 'Unable to serialize this MCU Select search.');
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

	function closeShareProjectDialog() {
		shareDialogOpen = false;
		shareDialogStatus = '';
		shareDialogShortUrl = '';
		shareDialogShortUrlStatus = '';
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
			loadError = describeError(error, 'Unable to build a shareable MCU Select URL.');
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
				'Unable to create a temporary MCU Select short URL.'
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
						unsupportedFormatMessage: 'This MCU Select share URL uses an unsupported format.',
						invalidShareMessage: 'The shared MCU Select URL is invalid or truncated.'
					})
			});

			if (!resolvedProject) {
				if (!options.quietIfMissing) {
					loadError = 'No shared MCU Select search was found in the current URL.';
				}

				shareStatus = '';
				return false;
			}

			return applyProjectJson(
				resolvedProject.projectJson,
				resolvedProject.source === 'short'
					? 'Loaded MCU Select search from temporary short URL.'
					: 'Loaded MCU Select search from shared URL.'
			);
		} catch (error) {
			loadError = describeError(error, 'Unable to load the shared MCU Select search.');
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

		try {
			applyProjectJson(await file.text(), `Loaded ${file.name}.`);
		} catch (error) {
			loadError = describeError(error, `Unable to read ${file.name}.`);
			shareStatus = '';
		} finally {
			input.value = '';
		}
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
			shareStatus = `Imported ${file.name} into the local MCU catalog.`;
		} catch (error) {
			loadError = describeError(error, `Unable to import ${file.name}.`);
			shareStatus = '';
		} finally {
			input.value = '';
		}
	}

	function handleExportProject() {
		const projectJson = getProjectJsonForShare();

		if (!projectJson) {
			return;
		}

		downloadText(`${slugify($projectName || 'mcu-select-search')}.json`, projectJson);
		shareStatus = 'Downloaded MCU Select project JSON.';
		loadError = '';
	}

	function handleExportDefinition() {
		triggerDefinitionImport();
	}

	function handleExportDefinitionForResult(definitionId: string) {
		const row = [
			...$matchSections.exact,
			...$matchSections.missing1,
			...$matchSections.missing2
		].find((candidate) => candidate.record.definition.id === definitionId);

		if (!row) {
			shareStatus = 'Unable to find the selected MCU definition for export.';
			loadError = '';
			return;
		}

		downloadText(
			`${slugify(row.record.definition.name)}.json`,
			serializeMcuDefinitionDocument(row.record.definition)
		);
		shareStatus = 'Downloaded MCU definition JSON.';
		loadError = '';
	}

	function openInPinmux(definitionId: string) {
		const url = buildPinmuxUrlForResult(definitionId, window.location.href);

		if (!url) {
			shareStatus = 'Unable to build the Pinmux handoff URL for this MCU.';
			loadError = '';
			return;
		}

		window.open(url, '_blank', 'noopener,noreferrer');
		shareStatus = '';
		loadError = '';
	}

	function handleResultCardKeydown(event: KeyboardEvent, definitionId: string) {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		selectResult(definitionId);
	}

	function getSectionColumnCount(groupCount: number): number {
		return Math.max(1, Math.min(groupCount, 7));
	}

	function getSectionTargetWidth(groupCount: number): string {
		const columnCount = getSectionColumnCount(groupCount);
		return `calc(${columnCount} * 13rem + ${Math.max(0, columnCount - 1)} * 0.6rem)`;
	}

	function onRequirementInput(groupId: string, value: string) {
		setRequirementMinimum(groupId, Number.parseInt(value || '0', 10) || 0);
	}

	function setPinCountRange(nextMin: number, nextMax: number) {
		const clampedMin = Math.max(pinCountBounds.min, Math.min(nextMin, nextMax));
		const clampedMax = Math.min(pinCountBounds.max, Math.max(nextMin, nextMax));

		setMinPinCount(clampedMin <= pinCountBounds.min ? null : clampedMin);
		setMaxPinCount(clampedMax >= pinCountBounds.max ? null : clampedMax);
	}

	function handlePinCountRangeChange(
		event: CustomEvent<{ lowerValue: number; upperValue: number }>
	) {
		setPinCountRange(event.detail.lowerValue, event.detail.upperValue);
	}

	function onEthernetPhyMinimumInput(value: string) {
		setEthernetPhyMinimum(Number.parseInt(value || '0', 10) || 0);
	}

	function onEthernetMacMinimumInput(value: string) {
		setEthernetMacMinimum(Number.parseInt(value || '0', 10) || 0);
	}

	$: requirementCountByGroupId = new Map(
		$project.requirements.map((requirement) => [requirement.groupId, requirement.minimumCount])
	);
	$: favoriteDefinitionIds = new Set($project.favoriteDefinitionIds);
	$: pinCountBounds = (() => {
		const pinCounts = $catalog.records.map((record) => record.pinCount);

		if (pinCounts.length === 0) {
			return { min: 0, max: 0 };
		}

		return {
			min: Math.min(...pinCounts),
			max: Math.max(...pinCounts)
		};
	})();
	$: selectedMinPinCount = $project.packageFilters.minPinCount ?? pinCountBounds.min;
	$: selectedMaxPinCount = $project.packageFilters.maxPinCount ?? pinCountBounds.max;
	$: pinCountRangeSpan = Math.max(1, pinCountBounds.max - pinCountBounds.min);
	$: minPinPercent = ((selectedMinPinCount - pinCountBounds.min) / pinCountRangeSpan) * 100;
	$: maxPinPercent = ((selectedMaxPinCount - pinCountBounds.min) / pinCountRangeSpan) * 100;
	$: packageKindOptions = packageKindValues.map((kind) => ({
		value: kind,
		label: formatPackageKindLabel(kind)
	}));
	$: ethernetSpeedOptions = mcuSelectEthernetSpeedValues.map((value) => ({
		value,
		label: ethernetSpeedLabels[value]
	}));
	$: ethernetMacInterfaceOptions = mcuSelectEthernetMacInterfaceValues.map((value) => ({
		value,
		label: ethernetInterfaceLabels[value]
	}));
	$: groupSections = Object.entries(
		$groupDefinitions.reduce(
			(accumulator, group) => {
				(accumulator[group.category] ??= []).push(group);
				return accumulator;
			},
			{} as Record<string, typeof $groupDefinitions>
		)
	).map(([category, groups]) => ({
		category,
		label: categoryLabels[category as keyof typeof categoryLabels] ?? category,
		groups,
		layoutKind: groups.length <= 1 ? 'compact' : groups.length <= 4 ? 'medium' : 'wide'
	}));
	$: visibleSections = [
		{ id: 'exact', title: 'Exact Match', rows: $matchSections.exact },
		{ id: 'missing1', title: 'Missing 1', rows: $matchSections.missing1 },
		{ id: 'missing2', title: 'Missing 2', rows: $matchSections.missing2 }
	].filter((section) => section.rows.length > 0 || section.id === 'exact');
	$: activeFilterCount =
		$matchSections.activeRequirements.length +
		($matchSections.activeEthernetFilters.phy ? 1 : 0) +
		($matchSections.activeEthernetFilters.mac ? 1 : 0);
	$: quickSummary = [
		`${$matchSections.exact.length} Exact`,
		$project.showCloseMatches ? `${$matchSections.missing1.length} Missing 1` : '',
		$project.showCloseMatches ? `${$matchSections.missing2.length} Missing 2` : '',
		`${$matchSections.hardFilteredCount} Package Filtered`,
		`${$project.favoriteDefinitionIds.length} Favorites`
	]
		.filter(Boolean)
		.join(' / ');

	onMount(() => {
		void loadProjectFromUrl({ quietIfMissing: true });
	});
</script>

<svelte:head>
	<title>MCU Select Tool</title>
	<meta
		name="description"
		content="Filter package-specific MCUs by normalized peripheral capability before opening them in Pinmux."
	/>
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
	<header class="hero-card">
		<div class="hero-copy">
			<p class="eyebrow">Tool</p>
			<h1>MCU Select</h1>
			<p class="lede">
				Filter package-specific MCUs by normalized peripheral counts, package constraints, and
				close-match scoring before opening a candidate in Pinmux.
			</p>
		</div>

		<div class="hero-controls">
			<div class="hero-controls__topline">
				<label class="field field--name">
					<span>Search Name</span>
					<input
						type="text"
						value={$projectName}
						on:input={(event) => setProjectName((event.currentTarget as HTMLInputElement).value)}
					/>
				</label>

				<label class="toggle-chip toggle-chip--compact">
					<input
						type="checkbox"
						checked={$project.showCloseMatches}
						on:change={(event) =>
							setShowCloseMatches((event.currentTarget as HTMLInputElement).checked)}
					/>
					<span>Show Near Misses</span>
				</label>
			</div>

			<div class="hero-action-groups">
				<section class="action-group action-group--row">
					<p class="action-group__label">Filter Selection</p>
					<div class="action-pill-row hero-action-pills">
						<TransferActionPill
							groupLabel="Filter selection JSON actions"
							formatLabel="JSON"
							importLabel="Upload filter selection JSON"
							exportLabel="Download filter selection JSON"
							onImport={triggerProjectImport}
							onExport={handleExportProject}
						/>
						<button
							type="button"
							class="action-button action-button--compact"
							on:click={openShareProjectDialog}>Share URL</button
						>
					</div>
				</section>

				<section class="action-group action-group--row">
					<p class="action-group__label">BYO MCU Config File</p>
					<div class="action-pill-row hero-action-pills">
						<TransferActionPill
							groupLabel="BYO MCU config JSON actions"
							formatLabel="MCU JSON"
							importLabel="Upload MCU config JSON"
							onImport={triggerDefinitionImport}
						/>
					</div>
				</section>
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

	<section class="panel-card filter-panel">
		<div class="panel-head">
			<div>
				<p class="eyebrow">Filters</p>
				<h2>Package And Capability Filters</h2>
			</div>
			<div class="panel-head__actions">
				<p class="panel-meta">{activeFilterCount} Active Filters</p>
				<button type="button" class="ghost-button ghost-button--small" on:click={clearAllFilters}
					>Clear Filters</button
				>
			</div>
		</div>

		<div class="filter-category-flow">
			<section
				class="group-section group-section--package group-section--compact"
				style:--section-target-width={'20rem'}
			>
				<div class="group-section__head">
					<h3>Package</h3>
					<p>Pin Count And Package Type</p>
				</div>

				<div class="filter-card-grid filter-card-grid--section filter-card-grid--single">
					<article class="filter-card filter-card--package">
						<div class="filter-card__title">
							<h4>Pin Count</h4>
						</div>

						<DoubleRangeSlider
							min={pinCountBounds.min}
							max={pinCountBounds.max}
							lowerValue={selectedMinPinCount}
							upperValue={selectedMaxPinCount}
							step={1}
							valueSuffix="Pins"
							lowerAriaLabel="Minimum pin count"
							upperAriaLabel="Maximum pin count"
							on:change={handlePinCountRangeChange}
						/>

						<div class="filter-chip-grid">
							{#each packageKindOptions as option}
								<label class="toggle-chip">
									<input
										type="checkbox"
										checked={$project.packageFilters.excludePackageKinds.includes(option.value)}
										on:change={(event) =>
											setPackageKindExcluded(
												option.value,
												(event.currentTarget as HTMLInputElement).checked
											)}
									/>
									<span>Avoid {option.label}</span>
								</label>
							{/each}
						</div>
					</article>
				</div>
			</section>

			<section
				class="group-section group-section--ethernet group-section--medium"
				style:--section-target-width={'calc(2 * 13rem + 0.6rem)'}
			>
				<div class="group-section__head">
					<h3>Ethernet</h3>
				</div>

				<div class="filter-card-grid filter-card-grid--section filter-card-grid--ethernet">
					<article class="filter-card filter-card--ethernet">
						<div class="filter-card__title">
							<h4>ETH PHY</h4>
							<span class="info-pill" title="Filter by PHY-facing Ethernet capability and speed."
								>i</span
							>
						</div>
						<label class="field field--compact">
							<span>Interfaces Needed</span>
							<input
								type="number"
								min="0"
								inputmode="numeric"
								value={$project.ethernetFilters.phy.minimumCount}
								on:input={(event) =>
									onEthernetPhyMinimumInput((event.currentTarget as HTMLInputElement).value)}
							/>
						</label>
						<div class="filter-chip-grid">
							{#each ethernetSpeedOptions as option}
								<label class="toggle-chip">
									<input
										type="checkbox"
										checked={$project.ethernetFilters.phy.speeds.includes(option.value)}
										on:change={(event) =>
											setEthernetPhySpeedEnabled(
												option.value,
												(event.currentTarget as HTMLInputElement).checked
											)}
									/>
									<span>{option.label}</span>
								</label>
							{/each}
						</div>
					</article>

					<article class="filter-card filter-card--ethernet">
						<div class="filter-card__title">
							<h4>ETH MAC Interface</h4>
							<span
								class="info-pill"
								title="Filter by Ethernet MAC speed and supported interface types such as MII or RMII."
								>i</span
							>
						</div>
						<label class="field field--compact">
							<span>Interfaces Needed</span>
							<input
								type="number"
								min="0"
								inputmode="numeric"
								value={$project.ethernetFilters.mac.minimumCount}
								on:input={(event) =>
									onEthernetMacMinimumInput((event.currentTarget as HTMLInputElement).value)}
							/>
						</label>
						<div class="filter-chip-grid">
							{#each ethernetSpeedOptions as option}
								<label class="toggle-chip">
									<input
										type="checkbox"
										checked={$project.ethernetFilters.mac.speeds.includes(option.value)}
										on:change={(event) =>
											setEthernetMacSpeedEnabled(
												option.value,
												(event.currentTarget as HTMLInputElement).checked
											)}
									/>
									<span>{option.label}</span>
								</label>
							{/each}
						</div>
						<div class="filter-chip-grid">
							{#each ethernetMacInterfaceOptions as option}
								<label class="toggle-chip">
									<input
										type="checkbox"
										checked={$project.ethernetFilters.mac.interfaces.includes(option.value)}
										on:change={(event) =>
											setEthernetMacInterfaceEnabled(
												option.value,
												(event.currentTarget as HTMLInputElement).checked
											)}
									/>
									<span>{option.label}</span>
								</label>
							{/each}
						</div>
					</article>
				</div>
			</section>

			{#each groupSections as section}
				<section
					class={`group-section group-section--${section.layoutKind}`}
					style:--section-target-width={getSectionTargetWidth(section.groups.length)}
				>
					<div class="group-section__head">
						<h3>{section.label}</h3>
					</div>

					<div class="filter-card-grid filter-card-grid--section">
						{#each section.groups as group}
							<article class="filter-card">
								<div class="filter-card__title">
									<h4>{group.label}</h4>
									<span class="info-pill" title={group.description}>i</span>
								</div>

								<label class="field field--compact">
									<span>Need at least</span>
									<input
										type="number"
										min="0"
										inputmode="numeric"
										value={requirementCountByGroupId.get(group.id) ?? 0}
										on:input={(event) =>
											onRequirementInput(group.id, (event.currentTarget as HTMLInputElement).value)}
									/>
								</label>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</section>

	<section class="panel-card results-panel">
		<div class="panel-head">
			<div>
				<p class="eyebrow">Results</p>
				<h2>Available MCUs</h2>
			</div>
			<p class="panel-meta">{quickSummary}</p>
		</div>

		{#if visibleSections.every((section) => section.rows.length === 0)}
			<p class="empty-state">
				No MCUs match the current package filters or capability requirements.
			</p>
		{/if}

		{#each visibleSections as section}
			{#if section.rows.length > 0 || section.id === 'exact'}
				<section class="result-section">
					<div class="result-section__head">
						<h3>{section.title}</h3>
						<p>{section.rows.length} rows</p>
					</div>

					<div class="results-card-list">
						<div class="results-card-list__legend" aria-hidden="true">
							<span>MCU</span>
							<span>Package</span>
							<span>Pins</span>
							<span>Actions</span>
						</div>

						{#if section.rows.length === 0}
							<p class="empty-state empty-state--table">No rows in this section.</p>
						{:else}
							{#each section.rows as row}
								<div
									class:result-card--favorite={favoriteDefinitionIds.has(row.record.definition.id)}
									class:result-card--active={$selectedResultId === row.record.definition.id}
									class="result-card"
									role="button"
									tabindex="0"
									on:click={() => selectResult(row.record.definition.id)}
									on:keydown={(event) => handleResultCardKeydown(event, row.record.definition.id)}
								>
									<div class="result-card__top">
										<div class="result-card__product">
											<button
												type="button"
												class:favorite-toggle--active={favoriteDefinitionIds.has(
													row.record.definition.id
												)}
												class="favorite-toggle"
												aria-label={favoriteDefinitionIds.has(row.record.definition.id)
													? 'Remove favorite'
													: 'Add favorite'}
												on:click|stopPropagation={() => toggleFavorite(row.record.definition.id)}
											>
												<svg viewBox="0 0 24 24" aria-hidden="true">
													<path
														d="m12 3.6 2.61 5.3 5.85.85-4.23 4.13 1 5.82L12 16.95 6.77 19.7l1-5.82L3.54 9.75l5.85-.85Z"
													/>
												</svg>
											</button>
											<div class="product-cell">
												<strong>{row.record.definition.name}</strong>
											</div>
										</div>

										<div class="result-card__package">
											<strong>{row.record.definition.package.name}</strong>
										</div>

										<div class="result-card__pins">{row.record.pinCount}</div>

										<div class="result-card__actions">
											<TransferActionPill
												groupLabel={`${row.record.definition.name} MCU config JSON action`}
												formatLabel="MCU JSON"
												exportLabel="Download MCU config JSON"
												onExport={() => handleExportDefinitionForResult(row.record.definition.id)}
											/>
											<button
												type="button"
												class="action-button"
												on:click|stopPropagation={() => openInPinmux(row.record.definition.id)}
											>
												Open In Pinmux
											</button>
										</div>
									</div>

									<div class="result-card__badges">
										{#if row.criteriaOutcomes.length === 0}
											<span class="outcome-pill outcome-pill--idle">No Requirements Set</span>
										{:else}
											{#each row.criteriaOutcomes as outcome}
												<span
													class:outcome-pill--missing={outcome.shortage > 0}
													class="outcome-pill"
												>
													{formatOutcome(outcome)}
												</span>
											{/each}
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</section>
			{/if}
		{/each}

		<div class="results-summary-strip">
			<p>{quickSummary}</p>
		</div>
	</section>

	<section class="panel-card guide-card" aria-labelledby="mcu-select-guide-heading">
		<div class="panel-head guide-card__head">
			<div>
				<p class="eyebrow">Guide</p>
				<h2 id="mcu-select-guide-heading">Using This Tool</h2>
			</div>
		</div>

		<div class="guide-grid">
			<article class="guide-block">
				<h3>Purpose</h3>
				<p>
					Start from capability requirements instead of pin assignments. Use the filter cards to ask
					for counts of buses, timers, serial blocks, Ethernet classes, memory controllers, and
					other MCU features.
				</p>
			</article>

			<article class="guide-block">
				<h3>Close Matches</h3>
				<p>
					When enabled, the table adds separate sections for parts missing exactly one or two
					requirement units. Package filters stay hard constraints and never move parts into
					close-match sections.
				</p>
			</article>

			<article class="guide-block">
				<h3>Pinmux Handoff</h3>
				<p>
					Every row can open a fresh Pinmux project in a new tab. The handoff pre-enables the first
					matching concrete peripherals for each active filter, while near-miss rows only enable
					peripherals that the selected MCU actually has.
				</p>
			</article>
		</div>
	</section>
</section>

<ProjectShareDialog
	open={shareDialogOpen}
	title="Share MCU Select search as URL"
	longHeading="Compressed share link"
	longDescription="This URL stores the serialized MCU Select search in the location hash."
	longUrl={shareDialogUrl}
	longStatus={shareDialogStatus}
	shortHeading="Temporary short URL"
	shortDescription="Temporary short URLs only work when the search uses built-in MCU definitions."
	shortUrl={shareDialogShortUrl}
	shortStatus={shareDialogShortUrlStatus}
	shortEligible={shareDialogShortUrlEligible}
	shortPending={shareDialogShortUrlPending}
	shortEmptyState="No temporary short URL has been created yet."
	copyLongLabel="Copy URL"
	copyShortLabel="Copy Short URL"
	createShortLabel="Create Short URL"
	regenerateShortLabel="Regenerate Short URL"
	on:close={closeShareProjectDialog}
	on:createshort={createShortShareProjectUrl}
/>

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
		width: min(148rem, 100%);
		margin: 0 auto;
	}

	.hero-card,
	.panel-card {
		background: var(--pinmux-surface);
		border: 1px solid var(--pinmux-panel-border);
		border-radius: 1.5rem;
		box-shadow: none;
	}

	.hero-card {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
		gap: 1.5rem;
		padding: 0.95rem 1rem;
	}

	.hero-copy h1,
	.panel-head h2,
	.group-section__head h3,
	.filter-card h3,
	.filter-card h4,
	.result-section__head h3,
	.guide-block h3 {
		margin: 0;
		font-family: 'Georgia', 'Times New Roman', serif;
	}

	.hero-copy h1 {
		font-size: clamp(1.55rem, 2.2vw, 2.25rem);
	}

	.lede {
		max-width: 66ch;
		margin: 0.45rem 0 0;
		color: var(--theme-text-secondary);
		line-height: 1.45;
		font-size: 0.95rem;
	}

	.eyebrow {
		margin: 0 0 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		font-size: 0.72rem;
		font-weight: 700;
		color: color-mix(in srgb, var(--pinmux-warm) 78%, var(--theme-text-secondary));
	}

	.hero-controls,
	.hero-action-groups,
	.hero-status-group,
	.filter-section-grid,
	.filter-card-grid,
	.feature-card-grid,
	.filter-chip-grid,
	.guide-grid,
	.action-row,
	.product-cell,
	.outcome-list {
		display: grid;
		gap: 0.75rem;
	}

	.hero-controls__topline {
		display: flex;
		gap: 0.65rem;
		align-items: end;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.hero-action-groups {
		gap: 0.55rem;
	}

	.field {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}

	.field span {
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--theme-text-secondary);
	}

	.field input,
	button {
		font: inherit;
	}

	.field input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		border-radius: 0.9rem;
		border: 1px solid var(--pinmux-divider);
		padding: 0.48rem 0.68rem;
		background: var(--pinmux-surface-elevated);
		color: var(--theme-text-primary);
		font-size: 0.92rem;
	}

	.toggle-chip {
		display: flex;
		align-items: center;
		gap: 0.42rem;
		padding: 0.42rem 0.62rem;
		border-radius: 999px;
		background: var(--pinmux-surface-elevated);
		border: 1px solid var(--pinmux-divider);
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	.toggle-chip span {
		overflow-wrap: anywhere;
	}

	.toggle-chip--compact {
		width: max-content;
		white-space: nowrap;
	}

	.action-button,
	.ghost-button {
		border-radius: 999px;
		padding: 0.55rem 0.78rem;
		cursor: pointer;
		transition:
			transform 120ms ease,
			border-color 120ms ease,
			background-color 120ms ease;
		font-size: 0.88rem;
	}

	.action-button {
		border: 1px solid color-mix(in srgb, var(--pinmux-accent) 28%, transparent);
		background: color-mix(in srgb, var(--pinmux-accent) 16%, var(--pinmux-surface-elevated));
		color: var(--theme-text-primary);
	}

	.ghost-button {
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-elevated);
		color: var(--theme-text-primary);
	}

	.action-button:hover,
	.ghost-button:hover {
		transform: translateY(-1px);
	}

	.ghost-button--small {
		padding: 0.38rem 0.64rem;
		font-size: 0.76rem;
	}

	.action-button--compact {
		padding: 0.48rem 0.72rem;
		font-size: 0.84rem;
	}

	.hero-share-status,
	.hero-share-status,
	.error-banner,
	.panel-meta,
	.group-section__head p,
	.result-section__head p,
	.empty-state,
	.empty-state--table {
		margin: 0;
		color: var(--theme-text-secondary);
	}

	.error-banner {
		color: color-mix(in srgb, #c23b22 80%, var(--theme-text-primary));
	}

	.panel-head,
	.result-section__head,
	.group-section__head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: start;
	}

	.filter-panel,
	.results-panel,
	.guide-card {
		padding: 0.9rem 1rem;
	}

	.feature-card-grid {
		grid-template-columns: repeat(auto-fit, minmax(14rem, 18rem));
		justify-content: start;
		margin-top: 0.7rem;
		gap: 0.6rem;
	}

	.filter-inline-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.48rem;
	}

	.filter-chip-grid {
		grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
	}

	.filter-section-grid {
		margin-top: 0.8rem;
	}

	.group-section {
		display: grid;
		gap: 0.55rem;
		inline-size: min(100%, var(--section-target-width, 13rem));
		align-self: start;
	}

	.filter-card-grid {
		grid-template-columns: repeat(auto-fit, minmax(11.25rem, 13rem));
		justify-content: start;
		gap: 0.6rem;
	}

	.group-section--package,
	.group-section--ethernet,
	.group-section--medium,
	.group-section--wide,
	.group-section--compact {
		max-inline-size: 100%;
	}

	.filter-card {
		display: grid;
		gap: 0.48rem;
		padding: 0.72rem 0.78rem;
		border-radius: 1.15rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid var(--pinmux-divider);
		min-width: 0;
	}

	.filter-card__title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.55rem;
		min-width: 0;
	}

	.filter-card__title h3,
	.filter-card__title h4 {
		font-size: 0.98rem;
	}

	.filter-card__title h4,
	.filter-card__title h3 {
		min-width: 0;
	}

	.info-pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-elevated);
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--theme-text-secondary);
		cursor: help;
		flex: none;
	}

	.action-group {
		display: grid;
		gap: 0.35rem;
		padding: 0.55rem 0.65rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid var(--pinmux-divider);
	}

	.action-group__label {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-text-secondary);
	}

	.action-row {
		grid-template-columns: repeat(auto-fit, minmax(13rem, max-content));
		align-items: center;
	}

	.action-pill-row {
		display: flex;
		gap: 0.45rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.hero-action-pills :global(.action-pill) {
		padding: 0.12rem 0.22rem 0.12rem 0.12rem;
	}

	.hero-action-pills :global(.action-pill__icon-button) {
		width: 1.8rem;
		height: 1.8rem;
	}

	.hero-action-pills :global(.action-pill__separator) {
		height: 1.1rem;
	}

	.hero-action-pills :global(.action-pill__type) {
		padding: 0 0.55rem 0 0.3rem;
		font-size: 0.67rem;
	}

	.results-card-list {
		display: grid;
		gap: 0.65rem;
	}

	.results-card-list__legend {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(9rem, 0.48fr) minmax(4rem, 0.24fr) minmax(
				0,
				0.9fr
			);
		gap: 1rem;
		padding: 0 1.1rem;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--theme-text-secondary);
	}

	.result-section + .result-section {
		margin-top: 1.2rem;
	}

	.result-section__head h3 {
		font-size: clamp(1.08rem, 1.45vw, 1.34rem);
	}

	.result-card {
		display: grid;
		gap: 0.55rem;
		padding: 0.72rem 0.82rem;
		border-radius: 1.1rem;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-muted);
		cursor: pointer;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.result-card:hover {
		background: color-mix(in srgb, var(--pinmux-accent) 7%, var(--pinmux-surface-muted));
	}

	.result-card--active {
		border-color: color-mix(in srgb, var(--pinmux-accent) 34%, transparent);
	}

	.result-card--favorite {
		background: color-mix(in srgb, #98c98c 18%, var(--pinmux-surface-muted));
		border-color: color-mix(in srgb, #7fb36f 36%, transparent);
	}

	.result-card__top {
		display: grid;
		grid-template-columns: minmax(0, 1.3fr) minmax(9rem, 0.48fr) minmax(4rem, 0.24fr) minmax(
				0,
				0.9fr
			);
		gap: 0.75rem;
		align-items: center;
	}

	.result-card__product {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.55rem;
		align-items: center;
		min-width: 0;
	}

	.result-card__package,
	.result-card__pins {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.result-card__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.42rem;
		flex-wrap: wrap;
	}

	.favorite-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.72rem;
		height: 1.72rem;
		padding: 0;
		border-radius: 999px;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-elevated);
		color: var(--theme-text-secondary);
		cursor: pointer;
		flex: none;
	}

	.favorite-toggle svg {
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
	}

	.favorite-toggle--active {
		color: #7da95f;
		border-color: color-mix(in srgb, #7da95f 45%, transparent);
		background: color-mix(in srgb, #7da95f 10%, var(--pinmux-surface-elevated));
	}

	.favorite-toggle--active svg {
		fill: currentColor;
	}

	.product-cell strong {
		font-size: 0.94rem;
		overflow-wrap: anywhere;
	}

	.result-card__badges {
		display: flex;
		gap: 0.38rem;
		flex-wrap: wrap;
		padding-top: 0.1rem;
	}

	.outcome-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.26rem 0.5rem;
		border-radius: 999px;
		background: var(--pinmux-surface-elevated);
		border: 1px solid var(--pinmux-divider);
		color: var(--theme-text-primary);
		font-size: 0.72rem;
	}

	.outcome-pill--missing {
		border-color: color-mix(in srgb, #c23b22 35%, transparent);
		background: color-mix(in srgb, #c23b22 10%, var(--pinmux-surface-elevated));
	}

	.outcome-pill--idle {
		color: var(--theme-text-secondary);
	}

	.results-summary-strip {
		margin-top: 0.8rem;
		padding: 0.68rem 0.82rem;
		border-radius: 1rem;
		border: 1px solid var(--pinmux-divider);
		background: var(--pinmux-surface-muted);
	}

	.results-summary-strip p {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--theme-text-secondary);
	}

	.guide-grid {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		margin-top: 0.65rem;
		gap: 0.55rem;
	}

	.guide-block {
		display: grid;
		gap: 0.4rem;
		padding: 0.72rem 0.78rem;
		border-radius: 1rem;
		background: var(--pinmux-surface-muted);
		border: 1px solid var(--pinmux-divider);
	}

	.guide-block p {
		margin: 0;
		line-height: 1.45;
		font-size: 0.9rem;
		color: var(--theme-text-secondary);
	}

	@media (max-width: 1280px) {
		.feature-card-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.filter-category-flow {
			gap: 0.65rem;
		}

		.group-section {
			inline-size: 100%;
		}

		.results-card-list__legend,
		.result-card__top {
			grid-template-columns: minmax(0, 1fr) minmax(8rem, 0.42fr) minmax(4rem, 0.18fr) minmax(
					0,
					0.8fr
				);
		}
	}

	@media (max-width: 1100px) {
		.hero-card {
			grid-template-columns: 1fr;
		}

		.feature-card-grid {
			grid-template-columns: 1fr;
		}

		.results-card-list__legend {
			display: none;
		}

		.result-card__top {
			grid-template-columns: minmax(0, 1fr);
		}

		.result-card__actions {
			justify-content: start;
		}
	}

	@media (max-width: 700px) {
		.hero-card,
		.filter-panel,
		.results-panel,
		.guide-card {
			padding: 0.8rem;
		}

		.filter-card-grid,
		.action-row {
			grid-template-columns: 1fr;
		}

		.action-pill-row {
			flex-direction: column;
			align-items: stretch;
		}

		.result-card {
			padding: 0.7rem;
		}
	}
</style>
