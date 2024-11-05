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
			<DynaImage src={data.props.image} alt={data.props.title} size="1" />
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
								<DynaImage src={postMeta.image} alt={postMeta.title} size="1" />
							</div>
						{/if}
						<div class="two-thirds inlinkable">
							{#if postMeta.title}
								<h2>{postMeta.title}</h2>
							{/if}
							{#if postMeta.date}
								<p>{postMeta.date}</p>
							{/if}
							{#if postMeta.author}
								<p>{postMeta.author}</p>
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
		border-color: var(--theme-light);
		border-style: solid;
		margin-bottom: 1rem;
		transition: all var(--transition-length);
	}

	:global(body.dark) .linkable {
		border-color: var(--theme-dark);
	}

	.inlinkable {
		border-radius: var(--theme-img-border-radius);
	}

	.linkable:hover {
		border-color: var(--theme-high-mid);
	}
	:global(body.dark) .linkable:hover {
		border-color: var(--theme-mid);
	}
</style>
