<script>
	import { page } from '$app/state';

	const currentUrl = $derived(page.url.pathname);
	const statusCode = $derived(page.status);
</script>

<svelte:head>
	<title>Error {statusCode} - Page Not Found</title>
	<meta name="description" content="The requested page could not be found." />
</svelte:head>

<h1>Error {statusCode}</h1>

{#if statusCode === 404}
	<p>Sorry, the page you're looking for doesn't exist.</p>
{:else}
	<p>Something went wrong. Please try again later.</p>
{/if}

{#if typeof window !== 'undefined' && currentUrl}
	<p>Requested URL: {currentUrl}</p>
{/if}

<a href="/">Return to homepage</a>
