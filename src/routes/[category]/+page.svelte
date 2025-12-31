<script lang="ts">
	import CategoryDisplay from '$lib/components/categoryDisplay.svelte';

	export let data;
</script>

<svelte:head>
	{#if data.props.title}
		<title>{data.props.title}</title>
		<meta name="description" content={data.props.description} />
	{/if}
</svelte:head>

<CategoryDisplay pageData={data.props}></CategoryDisplay>
