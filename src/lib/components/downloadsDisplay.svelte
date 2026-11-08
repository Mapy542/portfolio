<script lang="ts">
	import DynaImage from './Dynamics/DynaImage.svelte';

	import NetFlag from './netFlags/netFlag.svelte';

	import angle_right from '#lib/img/angle-right-solid-full.svg';
	import angle_down from '#lib/img/angle-down-solid-full.svg';

	interface DownloadEntry {
		title?: string;
		dateAdded?: string | null;
		dateModified?: string | null;
		thumbnail?: string | null;
		description?: string | null;
		src: string;
		promise?: Promise<string>;
		isLink: boolean;
	}

	const downloads =
		import.meta.glob('#lib/downloads/**/*', {
			eager: false,
			import: 'default',
			query: '?url'
		}) ?? {};

	const { downloadsGroup }: { downloadsGroup: Record<string, DownloadEntry> } = $props();
	let typedDownloadsGroup = $derived(downloadsGroup as Record<string, DownloadEntry>);

	let expandedFileName: string | null = $state(null);
	let resolvedUrls: Record<string, string> = $state({});

	const toggleExpanded = (fileName: string) => {
		expandedFileName = expandedFileName === fileName ? null : fileName;
	};

	// Resolve URLs for all files in downloadsGroup
	$effect(() => {
		if (typedDownloadsGroup) {
			const downloadEntries = Object.entries(typedDownloadsGroup) as Array<[string, DownloadEntry]>;

			downloadEntries.forEach(async ([fileName, fileData]) => {
				if (fileData.src && downloads[fileData.src] && !resolvedUrls[fileData.src]) {
					try {
						const url = (await downloads[fileData.src]()) as string;
						resolvedUrls[fileData.src] = url;
					} catch (e) {
						console.error(`Failed to resolve URL for ${fileData.src}:`, e);
						resolvedUrls[fileData.src] = fileData.src; // Fallback to original src
					}
				}
			});
		}
	});
</script>

<div class="downloads-group">
	{#if typedDownloadsGroup}
		<ul>
			{#each Object.keys(typedDownloadsGroup) as fileName}
				<li
					class:expanded={expandedFileName === fileName}
					style="display: flex; flex-direction: column;"
				>
					<div
						class="download-toggle"
						role="button"
						tabindex="0"
						aria-expanded={expandedFileName === fileName}
						aria-controls={`download-details-${fileName}`}
						onclick={() => toggleExpanded(fileName)}
						onkeydown={(e) => e.key === 'Enter' && toggleExpanded(fileName)}
					>
						<div class="title-group">
							{#if typedDownloadsGroup[fileName].isLink}
								<a
									href={resolvedUrls[typedDownloadsGroup[fileName].src] ??
										typedDownloadsGroup[fileName].src}
									onclick={(e) => e.stopPropagation()}
								>
									<NetFlag flagType="output">
										<div style="display: flex; align-items: center;">
											<img src={angle_right} alt="" aria-hidden="true" class="angle-icon" />
											<h3 style="max-width: 50%; overflow-wrap: break-word;">
												{typedDownloadsGroup[fileName].title}
											</h3>
										</div></NetFlag
									></a
								>
							{:else}
								<a
									href={resolvedUrls[typedDownloadsGroup[fileName].src] ??
										typedDownloadsGroup[fileName].src}
									onclick={(e) => e.stopPropagation()}
									download={fileName}
								>
									<NetFlag flagType="output">
										<div style="display: flex; align-items: center;">
											<img src={angle_down} alt="" aria-hidden="true" class="angle-icon" />
											<h3>{typedDownloadsGroup[fileName].title}</h3>
										</div>
									</NetFlag></a
								>
							{/if}

							<p style="padding: 0 1em;">
								{typedDownloadsGroup[fileName].dateModified
									? typedDownloadsGroup[fileName].dateModified
									: typedDownloadsGroup[fileName].dateAdded}
							</p>
						</div>
					</div>
					{#if expandedFileName === fileName}
						<div class="download-details" id={`download-details-${fileName}`}>
							{#if typedDownloadsGroup[fileName].thumbnail}
								<DynaImage
									src={typedDownloadsGroup[fileName].thumbnail}
									alt={typedDownloadsGroup[fileName].description ?? fileName}
									caption={null}
									paddingCount={1}
									scaleFactor={0.4}
								/>
							{/if}

							<div class="download-desc">
								{#if typedDownloadsGroup[fileName].description}
									<p class="download-description">{typedDownloadsGroup[fileName].description}</p>
								{/if}
								{#if typedDownloadsGroup[fileName].dateAdded}
									<p class="download-description">
										Added: {typedDownloadsGroup[fileName].dateAdded}
									</p>
								{/if}
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p>No downloads available.</p>
	{/if}
</div>

<style>
	.downloads-group ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.downloads-group li {
		border-bottom: 1px solid var(--border-color, #e4e4e7);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.download-toggle {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 0;
		background: none;
		border: 0;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition: all var(--transition-length);
		background-color: var(--theme-bg-primary);
		border-radius: var(--theme-img-border-radius);
	}

	.download-toggle:hover {
		background-color: var(--theme-bg-secondary);
	}

	.title-group {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		flex-wrap: wrap;
	}

	.angle-icon {
		width: 1em;
		height: 1em;
		margin-right: 0.5rem;
		color: var(--theme-text-primary);
	}

	.download-details {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: row;
		gap: 1rem;
	}

	.download-description {
		margin: 0.5rem 0 0;
	}
</style>
