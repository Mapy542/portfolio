<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';

	import logo from '$lib/img/logo.webp';

	export let categories: string[] = [];

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
		if (theme === 'Dark') window.document.body.classList.add('dark');
		else window.document.body.classList.remove('dark');
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
			theme = Themes.Light;
		}

		updateTheme();
	});
</script>

<header>
	<div class="header-container">
		<div class="header-logo">
			<a href="/">
				<img src={logo} alt="logo" class="logo" style="border-radius:revert;" />
			</a>
		</div>

		<div class="link-area"></div>
		<div class="category-list">
			{#each categories as category}
				<a href=""><div class="link-block"><p>{category}</p></div></a>
			{/each}
		</div>
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
</header>

<style>
	:root {
		--nav-page-font-size: 1cqw;
		--nav-page-vertical-font-size: 1cqh;
		/* ^^^ Set by makeLiTextSize() on page load*/
	}
	header {
		min-height: 10vh;
		height: fit-content; /*auto scale to menu size*/
		transition: all var(--transition-length) linear;

		background-color: var(--theme-mid);
		/*transition: color var(--transition-length) linear;*/
		-webkit-transition: var(--transition-length);
		background-image: '';
		background-size: cover;
		background-repeat: no-repeat;
		background-attachment: fixed;

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
		flex-direction: column;
		border-radius: 5vh;
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
		width: 8%; /* THIS is the size of the whole theme switch */
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
		background-color: var(--light-bg-primary);
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
		background-color: var(--dark-bg-primary);
		transition: color var(--transition-length) linear;
		-webkit-transition: var(--transition-length);
	}

	input:focus + .slider {
		box-shadow: 0 0 1px var(--light-accent);
		transition: color var(--transition-length) linear;
		-webkit-transition: var(--transition-length);
	}

	:global(body.dark) input:checked + .slider {
		background-color: var(--dark-bg-primary);
	}

	:global(body.dark) input:focus + .slider {
		box-shadow: 0 0 1px var(--dark-bg-primary);
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
		color: var(--light-txt-primary);
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
		color: var(--dark-txt-primary);
	}
</style>
