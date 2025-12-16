<script lang="ts">
	import { onMount } from 'svelte';

	import logo from '$lib/img/logo.webp';
	import logoInverted from '$lib/img/logo-invert.webp';

	export let categories: string[] = [];
	export let staticPages: any = {};

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
		const root = window.document.documentElement;
		if (theme === 'Dark') {
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

	function isTheme(value: unknown): value is Theme {
		return Object.keys(Themes).includes(String(value));
	}

	onMount(() => {
		const value = localStorage.getItem('theme');
		theme = isTheme(value) ? (value as Theme) : Themes.Dark;
		updateTheme();
	});

	let showCategories = false;
	function toggleCategories() {
		showCategories = !showCategories;
	}
</script>

<header class="site-header">
	<div class="header-container">
		<div class="header-logo">
			<a href="/" aria-label="Home">
				<img src={theme == Themes.Dark ? logoInverted : logo} alt="Site logo" class="logo" />
			</a>
		</div>

		<nav class="primary-nav" aria-label="Primary">
			<ul class="nav-list">
				{#each Object.keys(staticPages) as pageName}
					{#if staticPages[pageName].showHeader}
						<li class="nav-item">
							<a class="nav-link" href={staticPages[pageName].url}>
								{staticPages[pageName].title}
							</a>
						</li>
					{/if}
				{/each}
				<li class="nav-item">
					<button
						class="nav-link category-toggle"
						on:click={toggleCategories}
						aria-expanded={showCategories}
						aria-controls="category-menu"
						type="button"
					>
						Categories
					</button>
				</li>
			</ul>
		</nav>

		<div class="theme-toggle">
			<label class="switch" aria-label="Dark mode switch">
				<input
					type="checkbox"
					on:change={changeTheme}
					checked={theme === Themes.Dark}
					name="dark-mode toggle"
				/>
				<span class="slider round">
					<icon
						class={theme === Themes.Light
							? 'theme-icon fa-solid fa-sun'
							: 'theme-icon fa-solid fa-moon'}
					>
					</icon>
				</span>
			</label>
		</div>
	</div>

	<div
		id="category-menu"
		class="category-list {showCategories ? 'open' : 'closed'}"
		aria-hidden={!showCategories}
	>
		<div class="header-end" style="height: 2px;"></div>
		{#each categories as category}
			<a class="category-chip" href={'/' + category}><span>{category.replace('-', ' ')}</span></a>
		{/each}
		<div class="header-end" style="height: 2px;"></div>
	</div>
</header>

<style>
	.header-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.header-logo {
		padding: 1rem;
		width: 15%;
		max-width: 15rem;
	}

	.logo {
		width: 100%;
	}

	/* Primary nav */
	.primary-nav {
		flex: 1;
	}
	.nav-list {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem 0.75rem;
		flex-wrap: wrap;
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.nav-item {
		display: inline-flex;
	}
	.nav-link {
		color: var(--theme-text-primary);
		text-decoration: none;
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		border: 1px solid transparent;
		transition:
			background-color 160ms ease,
			color 160ms ease,
			border-color 160ms ease;
	}
	.nav-link:hover {
		background: color-mix(in oklab, var(--theme-accent) 15%, transparent 85%);
		border-color: color-mix(in oklab, var(--theme-accent) 40%, transparent 60%);
	}
	.category-toggle {
		cursor: pointer;
		background: none;
		border: none;
		font: inherit;
	}

	/* Theme switch */
	.theme-toggle {
		width: 5%;
		align-self: center;
		margin: 1% 3% 1% 1%;
		transition: all var(--transition-length) linear;
		--webkit-transition: var(--transition-length);
		max-width: 5rem;
	}

	@media screen and (max-width: 600px) {
		.theme-toggle {
			width: 15%;
		}

		.header-container {
			flex-direction: column;
		}
	}

	.switch {
		position: relative;
		display: grid;
		width: 100%;
		height: 100%;
	}
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	.slider {
		background-color: var(--theme-accent);
		transition: var(--transition-length);
		display: inline-flex;
		container-type: inline-size;
		height: 100%;
	}
	input + .slider {
		align-items: center;
		justify-content: center;
		font-family: 'Font Awesome 5 Free';
		color: #000;
		font-weight: 600;
	}
	input:checked + .slider {
		background-color: var(--theme-accent);
	}
	input:focus + .slider {
		box-shadow: 0 0 1px var(--theme-highlight);
	}
	.slider.round {
		border-radius: 50dvh;
	}
	.theme-icon {
		font-size: 20cqw;
		margin: 10%;
		color: var(--theme-text-primary);
		transition: var(--transition-length);
		transform: translateX(-30cqw);
	}
	:global(body.dark) .theme-icon {
		transform: translateX(30cqw);
	}

	/* Categories */
	.category-list {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem 0.75rem;
		width: 100%;
		flex-direction: row;
		flex-wrap: wrap;
		background-color: var(--theme-bg-primary);
		overflow: hidden;
		max-height: 0;
		transition: max-height 220ms ease;
	}
	.category-list.open {
		max-height: 520px;
	}
	.category-list.closed {
		max-height: 0;
	}
	.header-end {
		background-color: var(--theme-highlight);
		width: 100%;
		opacity: 0.35;
	}

	.category-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.35rem 0.7rem;
		border-radius: 999px;
		color: var(--theme-text-primary);
		text-decoration: none;
		border: 1px solid color-mix(in oklab, var(--theme-accent) 35%, transparent 65%);
		background: color-mix(in oklab, var(--theme-accent) 8%, transparent 92%);
		transition:
			background-color 160ms ease,
			border-color 160ms ease;
	}
	.category-chip:hover {
		background: color-mix(in oklab, var(--theme-accent) 18%, transparent 82%);
		border-color: color-mix(in oklab, var(--theme-accent) 55%, transparent 45%);
	}
</style>
