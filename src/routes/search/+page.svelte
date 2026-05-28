<script lang="ts">
	import DynaImage from '$lib/components/Dynamics/DynaImage.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';

	type SearchResultMeta = {
		author?: string;
		date?: string;
		description?: string;
		image?: string;
		title?: string;
	};

	type SearchPageData = {
		props?: {
			postMetas?: Record<string, SearchResultMeta>;
		};
	};

	export let data: SearchPageData;

	let resultsUplift: string[] = [];
	let searched = false;

	let resultEntries: Array<[string, SearchResultMeta]> = [];

	function getResultEntries(results: string[]): Array<[string, SearchResultMeta]> {
		const postMetas = data.props?.postMetas ?? {};

		return results.flatMap((result) => {
			const postMeta = postMetas[result];
			return postMeta ? [[result, postMeta] as [string, SearchResultMeta]] : [];
		});
	}

	$: resultEntries = getResultEntries(resultsUplift);
</script>

<svelte:head>
	<title>Search Bukoski.dev Content</title>
	<meta name="description" content="Search blog and content" />
	<meta
		name="keywords"
		content="search, blog, content, bukoski.dev, svelte, web development, programming, software engineering"
	/>
	<meta name="author" content="Eli Bukoski" />
</svelte:head>

<SearchBar openSearchOnGo={false} bind:resultsUplift bind:hasSearched={searched} />

<div style="height: 4vh;"></div>

{#if searched}
	{#if resultsUplift.length === 0}
		<p>No results found...</p>
	{/if}
	<div class="">
		{#if resultEntries.length > 0}
			{#each resultEntries as [resultPath, postMeta]}
				<a href={resultPath.replace('.md', '').replace('/src/lib/data/', '')}>
					<div class="flex-columns linkable">
						{#if postMeta.image}
							<div class="thirds inlinkable">
								<DynaImage
									src={postMeta.image}
									alt={postMeta.title}
									caption={postMeta.title ?? ''}
									scaleFactor=".33"
									paddingCount="1"
								/>
							</div>
						{/if}
						<div class="two-thirds inlinkable">
							{#if postMeta.title}
								<h2>{postMeta.title}</h2>
							{/if}
							<p>
								{#if postMeta.author}{postMeta.author}{/if}
								{#if postMeta.author && postMeta.date}
									-
								{/if}
								{#if postMeta.date}{postMeta.date}{/if}
							</p>
							{#if postMeta.description}
								<p>{postMeta.description}</p>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		{/if}
	</div>
{:else}
	<p>How to search!</p>
	<p>
		Enter keywords into the search bar, and results will be ranked by how closely they match your
		query.
	</p>
	<p>To negate or remove entries by keyword, append a "-" before the keyword.</p>
	<p>To further filter by post tags (strict matching), append a ":" before the tag.</p>
{/if}

<style>
	.linkable {
		border-radius: var(--theme-img-border-radius);
		border-color: var(--theme-bg-primary);
		border-style: solid;
		margin-bottom: 1rem;
		transition: all var(--transition-length);
	}

	.inlinkable {
		border-radius: var(--theme-img-border-radius);
	}

	.linkable:hover {
		border-color: var(--theme-link-hover);
	}
</style>
