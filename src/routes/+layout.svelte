<script>
	import Header from '../lib/components/Header.svelte';
	import './styles.css';
	import './columns.css';
	import Footer from '../lib/components/Footer.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="app">
	<Header categories={data.props.categories} />

	<main>
		<slot />
	</main>

	<Footer />
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--light-bg-primary);
		transition: color var(--transition-length) linear;
		-webkit-transition: var(--transition-length);
	}

	:global(body.dark) .app {
		background-color: var(--dark-bg-primary);
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 100rem;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>
