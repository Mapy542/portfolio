<script lang="ts">
	import DynaImage from '$lib/components/DynaImage.svelte';

	export let data;
</script>

<svelte:head>
	{#if data.props.title}
		<title>{data.props.title}</title>
		<meta name="description" content={data.props.description} />
	{/if}
</svelte:head>

{#if data.error}
	<h1>Error</h1>
	<p>{data.error}</p>
{/if}

<div class="flex-columns">
	<div class="thirds">
		{#if data.props.image}
			<DynaImage
				src={data.props.image}
				alt={data.props.title}
				scaleFactor="0.33"
				paddingCount="1"
			/>
		{/if}
		{#if data.props.title}
			<h1 style="text-align:revert;">{data.props.title}</h1>
		{/if}
		{#if data.props.description}
			<p>{data.props.description}</p>
		{/if}
	</div>
	<div class="two-thirds">
		{#if data.props.postMetas}
			{#each data.props.postMetas as postMeta, index}
				<a href={data.props.postSrcs[index].replace('.md', '')}>
					<div class="flex-columns linkable">
						{#if postMeta.image}
							<div class="thirds inlinkable">
								<DynaImage
									src={postMeta.image}
									alt={postMeta.title}
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
