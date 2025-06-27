<script>
	import DynaImage from '$lib/components/DynaImage.svelte';
	import Search from '$lib/components/SearchBar.svelte';

	export let data;
</script>

<svelte:head>
	<title>K400 Laser Cutter</title>
	<meta
		name="description"
		content="The K400 is my homemade large laser cutter based on the hobbyist generic CO2 laser, the K40."
	/>
	<meta property="og:title" content="K400 Laser Cutter" />
	<meta
		property="og:description"
		content="The K400 is my homemade large laser cutter based on the hobbyist generic CO2 laser, the K40."
	/>

	<meta property="author" content="Eli Bukoski" />
	<meta
		property="keywords"
		content="K400, K40, laser cutter, laser engraver, DIY, homemade, build, design, CO2, laser, cutter, engraver, Eli Bukoski"
	/>
</svelte:head>

<div class="flex-columns">
	<div class="thirds">
		<h1 style="color:var(--theme-highlight);">K400 Laser Cutter</h1>

		<div style="height: 1rem;" />

		<p>
			The K400 is my homemade large laser cutter based on the hobbyist generic CO2 laser, the K40.
		</p>
		<p>
			These posts detail my design and build process along with some tips I learned that are not
			common knowledge. Should you be interested in following the same path, there are design files
			you can download and build upon!
		</p>
	</div>
	<div class="two-thirds">
		<DynaImage
			src="laser-overview/far-oput-laser-in-laser.webp"
			alt="K400 Laser Cutter"
			scaleFactor=".66"
			paddingCount="1"
		/>
	</div>
</div>

<Search />

<div style="height: 3rem;" />

<h2>Updates</h2>
<div class="post-container">
	{#if data.props.postMetas}
		{#each data.props.postMetas as postMeta, index}
			<a href={postMeta['source'].replace('.md', '')}>
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
