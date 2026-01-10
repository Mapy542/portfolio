<script>
	export let markdownString = '';
</script>

<pre>
<code>
	{#each markdownString.split('\n') as line, index}
			{line}
		{/each}
</code>
</pre>

<style>
	pre code {
		border-radius: var(--theme-img-border-radius);
	}
</style>
