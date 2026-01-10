<script>
	import DynaImage from '$lib/components/Dynamics/DynaImage.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';

	export let data;

	let resultsUplift = [];
	let searched = false;

	let resultMetas = {};

	function getResultMetas(resultsUplift) {
		let resultsMetas = {};
		for (const result of resultsUplift) {
			resultsMetas[result] = data.props.postMetas[result];
		}
		return resultsMetas;
	}

	$: resultMetas = getResultMetas(resultsUplift);
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

<div style="height: 4vh;" />

{#if searched}
	{#if resultsUplift.length === 0}
		<p>No results found...</p>
	{/if}
	<div class="">
		{#if resultMetas}
			{#each Object.values(resultMetas) as postMeta, index}
				<a href={Object.keys(resultMetas)[index].replace('.md', '').replace('/src/lib/data/', '')}>
					<div class="flex-columns linkable">
						{#if postMeta.image}
							<div class="thirds inlinkable">
								<DynaImage
									src={postMeta.image}
									alt={postMeta.title}
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
