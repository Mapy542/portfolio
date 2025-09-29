<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{$page.status} - {$page.error?.message ?? 'An error occurred'}</title>
	<meta name="description" content="An error occurred while trying to load the page." />
	<meta name="keywords" content="error, page not found, 404, 500" />
</svelte:head>

<h1>{$page.status}</h1>
{#if $page.status === 404}
	<p>The page you are looking for could not be found.</p>
{:else}
	<p>{$page.error?.message ?? 'An unexpected error occurred.'}</p>
{/if}
