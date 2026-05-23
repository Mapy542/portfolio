<script lang="ts">
	import DynaImage from '$lib/components/Dynamics/DynaImage.svelte';
	export let data;
</script>

<svelte:head>
	<title>All Tools</title>
	<meta name="description" content="All web Tools available at Bukoski.dev" />
</svelte:head>

<h1>All Web-Tools</h1>
<p>Stateless engineering tools for Electrical Engineering and other related work.</p>

{#each Object.values(data.props.toolMetas) as toolMeta}
	<a href={'/tools' + toolMeta.url}>
		<div class="flex-columns tool-card">
			<div class="thirds">
				<DynaImage
					src={toolMeta.image}
					alt={toolMeta.title}
					caption=""
					scaleFactor="0.33"
					paddingCount="1"
				/>
			</div>
			<div class="two-thirds">
				<h2>{toolMeta.title}</h2>
				<p>{toolMeta.description}</p>
			</div>
		</div>
	</a>
{/each}

<style>
	.tool-card {
		border-radius: var(--theme-img-border-radius);
		border-color: var(--theme-bg-primary);
		border-style: solid;
		margin-bottom: 1rem;
		transition: all var(--transition-length);
	}

	.tool-card:hover {
		border-color: var(--theme-link-hover);
	}
</style>
