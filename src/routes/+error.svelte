<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	export let data;

	// Safe way to access page data during error rendering
	let currentUrl = '';
	let statusCode = data?.status || 500;

	// Only access page store in browser environment
	if (browser) {
		page.subscribe(($page) => {
			currentUrl = $page.url.pathname;
		});
	}
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

{#if browser && currentUrl}
	<p>Requested URL: {currentUrl}</p>
{/if}

<a href="/">Return to homepage</a>
