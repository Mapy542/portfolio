<script lang="ts">
	import DynaImage from '$lib/components/DynaImage.svelte';
	import bioData from './../../lib/data/bio.json';
</script>

<svelte:head>
	<title>Eli Bukoski</title>
	<meta name="description" content="Eli Bukoski- Credentials, skills, and biography." />
	<meta
		name="keywords"
		content="Eli Bukoski, Eli, Bukoski, Eli Bukoski Resume, Eli Bukoski Portfolio, Eli Bukoski Skills, Eli Bukoski Credentials, Eli Bukoski Biography"
	/>
	<meta name="author" content="Eli Bukoski" />
</svelte:head>

<div class="flex-columns">
	<div class="thirds">
		<DynaImage src="headshot/eli.webp" alt="Eli Bukoski" size="2" />
		<h2>Eli Bukoski</h2>
		<div class="bar" />
		<p>Electrical Engineer</p>
		{#each bioData.locations as location}
			<p>{location}</p>
		{/each}
		<div class="spacer" style="height: 1em;"></div>
	</div>
	<div class="two-thirds"></div>
</div>
