<script lang="ts">
	import MarkdownParser from '$lib/components/MDParser/MarkdownParser.svelte';
	import AutoHtmHeader from '$lib/components/AutoHTMHeader.svelte';
	export let data: {
		postKey: string;
		props: {
			markdownContent: string;
			postMeta: Record<string, unknown> | undefined;
		};
	};
</script>

<AutoHtmHeader postMeta={data.props.postMeta} />

{#key data.postKey}
	<MarkdownParser markdownString={data.props.markdownContent} />
{/key}
