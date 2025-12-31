<script lang="ts">
	import DynaImage from './DynaImage.svelte';

	type CategoryPageData = {
		title?: string;
		description?: string;
		error?: string;
		image?: string;
		postMetas: any[];
		postSrcs: any[];
	};

	export let pageData: CategoryPageData;
</script>

{#if pageData?.error}
	<h1>Error</h1>
	<p>{pageData.error}</p>
	<a href="/">Return to home page.</a>
{/if}

<div class="flex-columns">
	<div class="thirds">
		{#if pageData?.image}
			<DynaImage
				src={pageData.image}
				alt={pageData.title}
				caption=""
				scaleFactor="0.33"
				paddingCount="1"
			/>
		{/if}
		{#if pageData?.title}
			<h1 style="text-align:revert;">{pageData.title}</h1>
		{/if}
		{#if pageData?.description}
			<p>{pageData.description}</p>
		{/if}
		{#if pageData?.error === null}
			<p>Click through to see details, videos, and more.</p>
		{/if}
	</div>
	<div class="two-thirds">
		{#if pageData?.postMetas}
			{#each pageData.postMetas as postMeta, index}
				<a href={pageData.postSrcs[index].replace('.md', '')}>
					<div class="flex-columns linkable">
						{#if postMeta.image}
							<div class="thirds inlinkable">
								<DynaImage
									src={postMeta.image}
									alt={postMeta.title}
									caption=""
									scaleFactor=".22"
									paddingCount="2"
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
