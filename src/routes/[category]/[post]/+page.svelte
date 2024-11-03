<script lang="ts">
	import MarkdownParser from '$lib/components/MarkdownParser.svelte';
	export let data;
</script>

<MarkdownParser markdownString={data.props.markdownContent} />
