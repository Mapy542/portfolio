<script>
	export let postMeta = {};
</script>

<svelte:head>
	{#if postMeta.title}
		<title>{postMeta.title}</title>
	{/if}
	{#if postMeta.tags}
		<meta name="keywords" content={postMeta.tags.join(' ')} />
	{/if}
	{#if postMeta.author}
		<meta name="author" content={postMeta.author} />
	{/if}
	{#if postMeta.description}
		<meta name="description" content={postMeta.description} />
	{:else}
		<meta
			name="description"
			content="A blog about engineering, automation, and other portfolio projects."
		/>
	{/if}
</svelte:head>
