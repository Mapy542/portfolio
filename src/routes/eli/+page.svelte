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
		<p>
			{bioData.locations.join(' - ')}
		</p>
		<div class="spacer" style="height: 1em;"></div>
		<a href="#work" download><p style="color: var(--theme-accent);">Work Experience</p></a>
		<a href="#skills" download><p style="color: var(--theme-accent);">Skills</p></a>
		<a href="#education" download><p style="color: var(--theme-accent);">Education</p></a>

		<a href="/Resume.pdf" download><p style="color: var(--theme-accent);">Resume</p></a>
	</div>

	<div class="two-thirds">
		<div id="bio">
			<div class="spacer" style="height: 15vh" />
			<div class="flex-container" style="display:flex; flex-wrap: wrap;">
				<div class="vertical-bar" />
				<div class="column">
					<p>
						<span style="font-size:larger"><b>With</b></span> a keen eye for elegant engineering designs,
						strong troubleshooting skills, and a strategic approach to the big picture, I excel at creating
						solutions that are both effective and refined.
					</p>
				</div>
			</div>
			<div class="spacer" style="height: 15vh" />
		</div>

		<div id="work">
			<h2>Work Experience</h2>
		</div>

		{#if bioData.skills}
			<h2>Skills</h2>
			<div class="flex-container" id="skills" style="display:flex; flex-wrap: wrap;">
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

		{#if bioData.education}
			<div id="education" class="flex-container">
				<h2>Education</h2>
				{#each bioData.education as edu}
					<div class="edu-div">
						<h3>{edu.degree}</h3>
						<p>{edu.school}</p>
						<p>{edu.graduation}</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.flex-container {
		border-radius: var(--theme-img-border-radius);
		transition: all var(--transition-length);
	}

	.bar {
		background-color: var(--theme-mid);
	}
	.thirds:hover .bar {
		background-color: var(--theme-link);
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

	.edu-div {
		margin-bottom: 2em;
	}

	.edu-div .bar {
		transition: all var(--transition-length);
	}

	.flex-container:hover .vertical-bar {
		background-color: var(--theme-accent);
	}

	.edu-div:hover .bar {
		background-color: var(--theme-accent);
	}

	.column {
		flex: 1;
		text-wrap: wrap;
	}
</style>
