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
	let mermaidString = '';
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
			useMaxWidth: true
		}
	};

	$: {
		const lines = markdownString.split('\n');
		const lang = lines[0]?.trim() || '';
		isMermaid = lang === 'mermaid';
		const code = (
			lang && (lang === 'mermaid' || hljs.getLanguage(lang)) ? lines.slice(1) : lines
		).join('\n');
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
	<pre><code class="hljs">{@html highlightedHtml}</code></pre>
{:else if $theme === Themes.Dark}
	<Mermaid string={mermaidString} config={mermaidConfig} class="mermaid" />
{:else}
	<Mermaid string={mermaidString} config={mermaidConfig} class="mermaid" />
{/if}

<style>
	pre code {
		border-radius: var(--theme-img-border-radius);
	}

	:global(.mermaid) {
		margin: 1em 0;
		border-radius: var(--theme-img-border-radius);
		background-color: var(--theme-bg-secondary);
		width: fit-content;
	}
</style>
