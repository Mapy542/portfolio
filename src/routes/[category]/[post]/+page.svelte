<script lang="ts">
	import MarkdownParser from '$lib/components/MDParser/MarkdownParser.svelte';
	import AutoHtmHeader from '$lib/components/AutoHTMHeader.svelte';
	export let data;
</script>

<AutoHtmHeader postMeta={data.props.postMeta} />

<MarkdownParser markdownString={data.props.markdownContent} />
