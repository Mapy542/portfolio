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
		<div class="spacer" style="height: 1em;"></div>
		<p>
			{bioData.locations.join(' - ')}
		</p>
	</div>
	<div class="two-thirds">
		<h2>Work Experience</h2>

		{#if bioData.skills}
			<h2>Skills</h2>
			<div class="flex-container" style="display:flex; flex-wrap: wrap;">
				<div class="vertical-bar" />
				{#each bioData.skills as skill}
					<div class="column">
						<h3>{skill.category}</h3>
						{#each skill.skills as skillText}
							<p>{skillText}</p>
						{/each}
					</div>
					<div class="vertical-bar" />
				{/each}
			</div>
		{/if}
		<h2>Education</h2>
	</div>
</div>

<style>
	.bar {
		background-color: var(--theme-mid);
	}
	.thirds:hover .bar {
		background-color: var(--theme-accent);
	}

	.vertical-bar {
		width: 0.1em;
		background-color: var(--theme-mid);
		margin: 1em;
		margin-top: 2em;
		margin-bottom: 2em;
		border-radius: 0.05em;
		transition: all var(--transition-length);
	}

	.flex-container:hover .vertical-bar {
		background-color: var(--theme-accent);
	}

	.column {
		flex: 1;
		text-wrap: wrap;
	}
</style>
