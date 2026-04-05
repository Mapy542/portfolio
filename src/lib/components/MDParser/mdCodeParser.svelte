<script>
	import hljs from 'highlight.js';

	export let markdownString = '';

	let highlightedHtml = '';
	$: {
		const lines = markdownString.split('\n');
		const lang = lines[0]?.trim() || '';
		const code = (lang && hljs.getLanguage(lang) ? lines.slice(1) : lines).join('\n');
		if (lang && hljs.getLanguage(lang)) {
			highlightedHtml = hljs.highlight(code, { language: lang }).value;
		} else {
			highlightedHtml = hljs.highlightAuto(code).value;
		}
	}
</script>

<pre><code class="hljs">{@html highlightedHtml}</code></pre>

<style>
	pre code {
		border-radius: var(--theme-img-border-radius);
	}
</style>
