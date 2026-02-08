<script lang="ts">
	import DownloadsDisplay from '$lib/components/downloadsDisplay.svelte';

	export let data;
</script>

<svelte:head>
	<title>All Downloads Content</title>
	<meta name="description" content="All dowloads at bukoski.dev" />
</svelte:head>

<h1>All File Downloads</h1>
<p>Naviagte into each group to view all files.</p>

<DownloadsDisplay downloadsGroup={data.props.groupedDownloads} />
