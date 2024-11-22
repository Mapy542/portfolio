<script lang="ts">
	import './radialBG.css';
	import bioData from '$lib/data/bio.json';
	import footerData from '$lib/data/headerFooterData.json';
	import staticMetas from '$lib/data/staticMeta.json';
</script>

<footer class="gradientBG-topFade">
	<div class="footer-container">
		<div class="site-links">
			<p>Site Links</p>
			<div class="site-links-container">
				{#each Object.keys(staticMetas) as key, index}
					{#if staticMetas[key].showFooter}
						<a href={staticMetas[key].url}><p>{staticMetas[key].title}</p></a>
					{/if}
				{/each}
			</div>
			<p>Sister Sites</p>
			<div class="site-links-container">
				{#each Object.keys(footerData.sisterSites) as key, index}
					{#if footerData.sisterSites[key].showFooter}
						<a href={footerData.sisterSites[key].url}><p>{key}</p></a>
					{/if}
				{/each}
			</div>
		</div>
		<div class="contact-wrapper">
			<div class="contact">
				{#each Object.keys(bioData.contact) as key, index}
					<a href={bioData.contact[key]}><p>{key}</p></a>
					{#if index < Object.keys(bioData.contact).length - 1}
						<p style="padding-left:1rem; padding-right: 1rem;">-</p>
					{/if}
				{/each}
			</div>
			<p>Proudly hand-written in Svelte and Sveltekit.</p>
		</div>
	</div>
</footer>

<style>
	footer {
		padding-bottom: 2rem;
		padding-top: 3rem;
	}
	.footer-container {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
	}
	.site-links {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 45cqw;
	}

	.site-links-container {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		width: 50%;
		align-items: center;
	}

	.site-links-container a {
		flex: 1;
		padding-left: 1rem;
		padding-right: 1rem;
		align-self: center;
	}

	.contact-wrapper {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 45cqw;
	}
	.contact {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		width: 100%;
		flex-wrap: wrap;
	}
	.contact p {
		color: var(--theme-link);
	}

	.site-links-container a p {
		color: var(--theme-link);
	}

	:global(body.dark) .contact p {
		color: var(--theme-accent);
	}

	:global(body.dark) .site-links-container a p {
		color: var(--theme-accent);
	}

	@media (max-width: 600px) {
		.footer-container {
			flex-direction: column;
		}
		.site-links {
			margin-bottom: 1rem;
			width: 90vw;
		}
		.contact-wrapper {
			width: 90vw;
		}
	}
</style>
