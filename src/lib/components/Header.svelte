<script lang="ts">
	import { onMount } from 'svelte';

	import logo from '$lib/img/logo.webp';
	import logoInverted from '$lib/img/logo-invert.webp';

	import './radialBG.css';

	export let categories: string[] = [];
	export let staticPages: any = {};

	//Header Background Img Load
	const Themes = {
		Light: 'Light',
		Dark: 'Dark'
	} as const;

	type ThemeKeys = keyof typeof Themes;
	type Theme = (typeof Themes)[ThemeKeys];

	let theme: Theme = Themes.Light;

	function changeTheme() {
		theme = theme == Themes.Light ? Themes.Dark : Themes.Light;
		localStorage.setItem('theme', theme);
		updateTheme();
	}

	function updateTheme() {
		if (theme === 'Dark') {
			let root = window.document.documentElement;
			root.style.setProperty('--theme-text-primary', 'var(--dark-text-primary)');
			root.style.setProperty('--theme-text-secondary', 'var(--dark-text-secondary)');
			root.style.setProperty('--theme-text-tertiary', 'var(--dark-text-tertiary)');
			root.style.setProperty('--theme-bg-primary', 'var(--dark-bg-primary)');
			root.style.setProperty('--theme-bg-secondary', 'var(--dark-bg-secondary)');
			root.style.setProperty('--theme-bg-tertiary', 'var(--dark-bg-tertiary)');
			root.style.setProperty('--theme-accent', 'var(--dark-accent)');
			root.style.setProperty('--theme-highlight', 'var(--dark-highlight)');
			root.style.setProperty('--theme-link', 'var(--dark-link)');
			root.style.setProperty('--theme-link-hover', 'var(--dark-link-hover)');
			root.style.setProperty('--theme-link-visited', 'var(--dark-link-visited)');

			window.document.body.classList.add('dark');
		} else {
			let root = window.document.documentElement;
			root.style.setProperty('--theme-text-primary', 'var(--light-text-primary)');
			root.style.setProperty('--theme-text-secondary', 'var(--light-text-secondary)');
			root.style.setProperty('--theme-text-tertiary', 'var(--light-text-tertiary)');
			root.style.setProperty('--theme-bg-primary', 'var(--light-bg-primary)');
			root.style.setProperty('--theme-bg-secondary', 'var(--light-bg-secondary)');
			root.style.setProperty('--theme-bg-tertiary', 'var(--light-bg-tertiary)');
			root.style.setProperty('--theme-accent', 'var(--light-accent)');
			root.style.setProperty('--theme-highlight', 'var(--light-highlight)');
			root.style.setProperty('--theme-link', 'var(--light-link)');
			root.style.setProperty('--theme-link-hover', 'var(--light-link-hover)');
			root.style.setProperty('--theme-link-visited', 'var(--light-link-visited)');

			window.document.body.classList.remove('dark');
		}
	}

	function isTheme(theme: unknown): theme is Theme {
		for (const themeType of Object.keys(Themes)) {
			if (theme == themeType) return true;
		}

		return false;
	}

	onMount(() => {
		const value = localStorage.getItem('theme');

		if (isTheme(value)) {
			theme = value;
		} else {
			theme = Themes.Dark;
		}

		updateTheme();
	});

	let showCategories = false;
	function toggleCategories() {
		showCategories = !showCategories;
	}
</script>

<header class="">
	<div class="header-container">
		<div class="header-logo">
			<a href="/">
				<img
					src={theme == Themes.Dark ? logoInverted : logo}
					alt="logo"
					class="logo"
					style="border-radius:revert;"
				/>
			</a>
		</div>

		<div class="link-area">
			{#each Object.keys(staticPages) as pageName}
				{#if staticPages[pageName].showHeader}
					<a href={staticPages[pageName].url}>
						<div class="link-block">
							<p>{staticPages[pageName].title}</p>
						</div>
					</a>
				{/if}
			{/each}
			<button class="category-button" on:click={toggleCategories}>Toggle Categories</button>
		</div>
		<div class="theme-toggle">
			<label class="switch" aria-label="Dark mode switch">
				<input
					type="checkbox"
					on:change={changeTheme}
					checked={theme === Themes.Dark}
					name="dark-mode toggle"
				/>
				<span class="slider round">
					<i
						class={theme === Themes.Light
							? 'theme-icon fa-solid fa-sun'
							: 'theme-icon fa-solid fa-moon'}
					/>
				</span>
			</label>
		</div>
	</div>

	<div class="category-list {showCategories ? 'open' : 'closed'}">
		<div class="header-end" style="height: 2px;"></div>
		{#each categories as category}
			<a href={'/' + category}><div class="link-block"><p>{category.replace('-', ' ')}</p></div></a>
		{/each}
		<div class="header-end" style="height: 2px;"></div>
	</div>

	<div class="spacer" style="height: 1em;"></div>
</header>

<style>
	.category-list {
		display: flex;
		justify-content: space-around;
		align-items: center;
		width: 100%;
		flex-direction: row;
		flex-wrap: wrap;
		background-color: var(--theme-bg-primary);

		overflow: hidden;
		max-height: 0;
		transition: max-height 0.5s linear;
	}

	.category-list.open {
		/*height: auto; /* This will be overridden by max-height */
		max-height: 500px; /* Adjust this value based on your content */
	}

	.category-list.closed {
		max-height: 0;
	}

	.category-button {
		background-color: var(--theme-bg-primary);
		border: solid 2px var(--theme-accent);
		color: var(--theme-text-primary);
		padding: 0.5em;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
		margin: 4px 2px;
		cursor: pointer;
		border-radius: 5px;
	}

	.link-block {
		border-radius: var(--theme-img-border-radius);
		border: solid 2px var(--theme-accent);
		padding: 0.5em;
		margin: 10px;
	}

	.link-block p {
		padding: revert;
		margin: 0;
	}

	header {
		min-height: 10vh;
		height: fit-content; /*auto scale to menu size*/
		transition: all var(--transition-length) linear;
		background-position: center;
	}

	.header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.header-logo {
		padding: 1rem;
		width: 15%;
		max-width: 20vw;
	}

	.logo {
		width: 100%;
	}

	.link-area {
		/*max-width: 80%;
		min-width: 40%;*/
		display: flex;
		border-radius: 5vh;
		justify-content: space-around;
		align-items: center;
		width: 100%;
		flex-direction: row;
		flex-wrap: wrap;
	}

	@media screen and (max-width: 1024px) {
		/* Biggest menu possible until 1024px */
		.link-area {
			width: 85%;
		}
	}

	@media screen and (min-width: 1024px) and (max-width: 1440px) {
		/* Medium menu size */
		.link-area {
			width: 75%;
		}
	}

	@media screen and (min-width: 1440px) and (max-width: 2560px) {
		/* Smaller menu size */
		.link-area {
			width: 65%;
		}
		.header-logo {
			width: 10%;
		}
	}

	@media screen and (min-width: 2560px) {
		/* Smallest menu size */
		.link-area {
			width: 55%;
		}
		.header-logo {
			width: 10%;
		}
	}

	/*-- Theme Switch --*/

	.theme-toggle {
		width: 5%; /* THIS is the size of the whole theme switch */
		/*min-width: 30px;*/
		/*max-width: 50px;*/
		align-self: center;
		margin: 1%;
		margin-right: 3%;
		transition: all var(--transition-length) linear;
		--webkit-transition: var(--transition-length);
	}

	@media screen and (max-width: 600px) {
		.theme-toggle {
			width: 15%;
		}
	}

	.switch {
		position: relative;
		display: grid;
		width: 100%;
		height: 100%;
	}

	/* Hide default HTML checkbox */
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	/* The slider */
	.slider {
		/*position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;*/
		background-color: var(--theme-accent);
		-webkit-transition: var(--transition-length);
		transition: var(--transition-length);
		display: inline-flex;
		container-type: inline-size;
		height: 100%;
	}

	input + .slider {
		align-items: center;
		justify-content: center;
		font-family: 'Font Awesome 5 Free';
		content: '\f00c';
		color: #000;
		font-weight: 600;
	}

	input:checked + .slider {
		background-color: var(--theme-accent);
		transition: color var(--transition-length) linear;
		-webkit-transition: var(--transition-length);
	}

	input:focus + .slider {
		box-shadow: 0 0 1px var(--theme-highlight);
		transition: color var(--transition-length) linear;
		-webkit-transition: var(--transition-length);
	}

	/*input:checked + .slider:before {
		-webkit-transform: translateX(80%);
		-ms-transform: translateX(80%);
		transform: translateX(80%);
	} WHGAT THIS DOOOOOO*/

	/* Rounded sliders */
	.slider.round {
		border-radius: 50dvh;
	}

	.slider.round:before {
		border-radius: 0%;
	} /* WHAT THIS DO?? */

	.theme-icon {
		font-size: 20cqw;
		margin: 10%;
		color: var(--theme-text-primary);
		-webkit-transition: var(--transition-length);
		transition: var(--transition-length);
		-webkit-transform: translateX(-30cqw);
		-ms-transform: translateX(-30cqw);
		transform: translateX(-30cqw);
	}

	/*@media screen and (max-width: 600px) {
		.theme-icon {
			font-size: medium;
		}
	}
	@media screen and (max-width: 400px) {
		.theme-icon {
			font-size: small;
		}
	}*/

	:global(body.dark) .theme-icon {
		-webkit-transform: translateX(30cqw);
		-ms-transform: translateX(30cqw);
		transform: translateX(30cqw);
	}

	.header-end {
		background-color: var(--theme-highlight);
		width: 100%;
	}
</style>
