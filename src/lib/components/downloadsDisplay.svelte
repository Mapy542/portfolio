<script lang="ts">
	import DynaImage from './Dynamics/DynaImage.svelte';

	interface DownloadEntry {
		dateAdded: string;
		dateModified: string | null;
		thumbnail: string | null;
		description: string | null;
		src: string;
		promise: Promise<string>;
		isLink: boolean;
	}

	const downloads =
		import.meta.glob('$lib/downloads/**/*', {
			eager: false,
			import: 'default',
			query: '?url'
		}) ?? {};

	const { downloadsGroup } = $props<{ downloadsGroup: Record<string, DownloadEntry> }>();

	let expandedFileName: string | null = $state(null);
	let resolvedUrls: Record<string, string> = $state({});

	const toggleExpanded = (fileName: string) => {
		expandedFileName = expandedFileName === fileName ? null : fileName;
	};

	// Resolve URLs for all files in downloadsGroup
	$effect(() => {
		if (downloadsGroup) {
			Object.entries(downloadsGroup).forEach(async ([fileName, fileData]) => {
				if (fileData.src && downloads[fileData.src] && !resolvedUrls[fileData.src]) {
					try {
						const url = await downloads[fileData.src]();
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
	{#if downloadsGroup}
		<ul>
			{#each Object.keys(downloadsGroup) as fileName}
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
							{#if downloadsGroup[fileName].isLink}
								<a
									href={resolvedUrls[downloadsGroup[fileName].src] ?? downloadsGroup[fileName].src}
									onclick={(e) => e.stopPropagation()}
								>
									<span class="download-title download-pill">
										<icon class="fa-solid fa-angle-right" aria-hidden="true"></icon>
										<h3>{downloadsGroup[fileName].title}</h3></span
									></a
								>
							{:else}
								<a
									href={resolvedUrls[downloadsGroup[fileName].src] ?? downloadsGroup[fileName].src}
									onclick={(e) => e.stopPropagation()}
									download={fileName}
								>
									<span class="download-title download-pill">
										<icon class="fa-solid fa-angle-down" aria-hidden="true"></icon>
										<h3>{downloadsGroup[fileName].title}</h3></span
									></a
								>
							{/if}

							<p>
								{downloadsGroup[fileName].dateModified
									? downloadsGroup[fileName].dateModified
									: downloadsGroup[fileName].dateAdded}
							</p>
						</div>
					</div>
					{#if expandedFileName === fileName}
						<div class="download-details" id={`download-details-${fileName}`}>
							{#if downloadsGroup[fileName].thumbnail}
								<DynaImage
									src={downloadsGroup[fileName].thumbnail}
									alt={downloadsGroup[fileName].description ?? fileName}
									caption={null}
									paddingCount={1}
									scaleFactor={0.4}
								/>
							{/if}

							<div class="download-desc">
								{#if downloadsGroup[fileName].description}
									<p class="download-description">{downloadsGroup[fileName].description}</p>
								{/if}
								<p class="download-description">Added: {downloadsGroup[fileName].dateAdded}</p>
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
	}

	.download-title {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.title-group {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.download-link {
		text-decoration: none;
		color: inherit;
	}

	.download-pill {
		background: var(--page-bg, transparent);
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		transition:
			box-shadow 0.2s ease,
			transform 0.2s ease,
			border-color 0.2s ease;
		border: 1px solid transparent;
	}

	.download-pill:hover,
	.download-pill:focus-visible {
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
		transform: translateY(-1px);
		border-color: rgba(0, 0, 0, 0.1);
		background-color: var(--theme-bg-secondary);
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
