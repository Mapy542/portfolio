<script lang="ts">
	import DownloadsDisplay from '$lib/components/downloadsDisplay.svelte';
	import DynaImage from '$lib/components/Dynamics/DynaImage.svelte';

	export let data;
</script>

<svelte:head>
	{#if data.props?.groupedDownloads.title}
		<title>{data.props?.groupedDownloads.title} | Downloads</title>
	{:else}
		<title>Downloads | bukoski.dev</title>
	{/if}
	{#if data.props?.groupedDownloads.desc}
		<meta name="description" content={data.props?.groupedDownloads.desc} />
	{/if}
</svelte:head>

<div class="flex-columns">
	<div class="thirds">
		<DynaImage
			src={data.props?.groupedDownloads.heroImg}
			alt={data.props?.groupedDownloads.title}
			caption={null}
			paddingCount={1}
			scaleFactor={0.4}
		/>
	</div>
	<div class="two-thirds">
		<h1>{data.props?.groupedDownloads.title}</h1>

		<p>{data.props?.groupedDownloads.desc}</p>
	</div>
</div>

<DownloadsDisplay downloadsGroup={data.props.groupedDownloads.content} />
