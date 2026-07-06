<script>
	import hljs from 'highlight.js';
	import { Mermaid } from '@friendofsvelte/mermaid';
	import { theme, Themes } from '$lib/stores/theme';
	import { browser } from '$app/environment';

	export let markdownString = '';

	let highlightedHtml = '';

	/** @param {string} name */
	const cssValue = (name) =>
		browser ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '';

	let isMermaid = false;
	let isGanttForceMaXWidth = false;
	let mermaidString = '';

	let code = '';

	$: mermaidConfig = {
		theme: $theme === Themes.Dark ? 'dark' : 'default',
		themeVariables: {
			background: cssValue('--theme-bg-primary'),
			primaryColor: cssValue('--theme-accent'),
			secondaryColor: cssValue('--theme-highlight'),
			tertiaryColor: cssValue('--theme-link-hover'),
			primaryTextColor: cssValue('--theme-text-primary'),
			lineColor: cssValue('--theme-text-secondary'),
			border1: cssValue('--theme-accent'),
			nodeBkg: cssValue('--theme-bg-secondary'),
			clusterBkg: cssValue('--theme-bg-tertiary'),
			arrowheadColor: cssValue('--theme-text-primary'),
			titleColor: cssValue('--theme-highlight')
		},
		flowchart: {
			useMaxWidth: true,
			htmlLabels: true,
			curve: 'basis'
		},
		sequence: {
			useMaxWidth: true
		},
		gantt: {
			useMaxWidth: true,
			htmlLabels: true
		}
	};

	$: {
		const lines = markdownString.split('\n');
		const lang = lines[0]?.trim() || '';
		isMermaid = lang === 'mermaid';
		isGanttForceMaXWidth = lines[1]?.includes('gantt') || false;
		code = (lang && (lang === 'mermaid' || hljs.getLanguage(lang)) ? lines.slice(1) : lines).join(
			'\n'
		);
		if (isMermaid) {
			mermaidString = code;
		} else if (lang && hljs.getLanguage(lang)) {
			highlightedHtml = hljs.highlight(code, { language: lang }).value;
		} else {
			highlightedHtml = hljs.highlightAuto(code).value;
		}
	}
</script>

{#if !isMermaid}
	<div class="code-block">
		<pre><code class="hljs">{@html highlightedHtml}</code></pre>
		<button
			class="copy-button"
			on:click={() => {
				navigator.clipboard.writeText(markdownString);
			}}
			aria-label="Copy code to clipboard"
		>
			⎘
		</button>
	</div>
{:else if $theme === Themes.Dark}
	<Mermaid
		string={mermaidString}
		config={mermaidConfig}
		class={isGanttForceMaXWidth ? 'mermaid gantt-force-max-width' : 'mermaid'}
	/>
{:else}
	<Mermaid
		string={mermaidString}
		config={mermaidConfig}
		class={isGanttForceMaXWidth ? 'mermaid gantt-force-max-width' : 'mermaid'}
	/>
{/if}

<style>
	.code-block {
		width: 100%;
		background-color: var(--theme-bg-primary);
		position: relative;
	}

	pre code {
		border-radius: var(--theme-img-border-radius);
	}

	.copy-button {
		position: absolute;
		top: 0.5em;
		right: 0.5em;
		background-color: var(--theme-bg-secondary);
		color: var(--theme-text-primary);
		border: none;
		border-radius: 4px;
		padding: 0.2em 0.5em;
		cursor: pointer;
	}

	.copy-button:hover {
		background-color: var(--theme-accent);
		color: var(--theme-bg-primary);
	}

	:global(.mermaid) {
		margin: 1em 0;
		border-radius: var(--theme-img-border-radius);
		background-color: var(--theme-bg-secondary);
		width: fit-content;
	}

	:global(.mermaid.gantt-force-max-width) {
		width: 100%;
	}
</style>
