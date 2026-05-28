<script lang="ts">
	import CategoryDisplay from '$lib/components/categoryDisplay.svelte';

	export let data;
</script>

<svelte:head>
	{#if data.props?.title}
		<title>{data.props.title}</title>
	{/if}
	{#if data.props?.description}
		<meta name="description" content={data.props.description} />
	{/if}
</svelte:head>

{#if data.props}
	<CategoryDisplay pageData={data.props}></CategoryDisplay>
{/if}
