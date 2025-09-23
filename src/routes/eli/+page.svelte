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
		<DynaImage src="headshot/eli.webp" alt="Eli Bukoski" scaleFactor=".33" paddingCount="1" />
		<h2>Eli Bukoski</h2>
		<div class="bar" />
		<p>Electrical Engineer</p>
		<div class="spacer" style="height: 1em;"></div>
		{#if bioData.employed}
			<p>Currently working for {bioData.employed}.</p>
		{:else}
			<p>Currently seeking employment.</p>
		{/if}
		<a href="#work"><p style="color: var(--theme-link);">Work Experience</p></a>
		<a href="#skills"><p style="color: var(--theme-link);">Skills</p></a>
		<a href="#education"><p style="color: var(--theme-link);">Education</p></a>
	</div>

	<div class="two-thirds">
		<div id="bio">
			<div class="spacer" style="height: 15vh" />
			<div class="flex-container" style="display:flex; flex-wrap: wrap;">
				<div class="vertical-bar" />
				<div class="column">
					<p>
						<span style="font-size:3em"><b>With</b></span> a keen eye for elegant engineering designs,
						strong troubleshooting skills, and a strategic approach to the big picture, I excel at creating
						solutions that are both effective and refined.
					</p>
				</div>
			</div>
			<div class="spacer" style="height: 15vh" />
		</div>
	</div>
</div>

<span class="spacer" style="height: 20vh;" />

<div id="work">
	<h1>Work Experience</h1>
	<div class="flex-container" style="display:flex; flex-wrap: wrap;">
		{#if bioData.work}
			{#each bioData.work as job}
				<div class="work-card">
					<h3>{job.position}</h3>
					<p>{job.name} - {job.location}</p>
					<ul>
						{#each job.responsibilities as role}
							<li>{role}</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	</div>
</div>
<span class="spacer" style="height: 20vh;" />

{#if bioData.skills}
	<h1>Skills</h1>
	<div class="flex-container" id="skills" style="display:flex; flex-wrap: wrap;">
		<div class="vertical-bar" />
		{#each bioData.skills as skill}
			<div class="column">
				<h3 style="justify-self:center;">{skill.category}</h3>
				{#each skill.skills as skillText}
					<p style="justify-self:center;">{skillText}</p>
				{/each}
			</div>
			<div class="vertical-bar" />
		{/each}
	</div>
	<span class="spacer" style="height: 20vh;" />
{/if}

{#if bioData.education}
	<div id="education" class="flex-container">
		<h1>Education</h1>
		{#each bioData.education as edu}
			<div class="edu-div">
				<h3>{edu.degree}</h3>
				<p>{edu.school}</p>
				<p>{edu.graduation}</p>
				{#if edu.gpa}
					<p>GPA: {edu.gpa}</p>
				{/if}
			</div>
		{/each}
	</div>
	<span class="spacer" style="height: 20vh;" />
{/if}

<style>
	.flex-container {
		border-radius: var(--theme-img-border-radius);
		transition: all var(--transition-length);
	}

	.bar {
		background-color: var(--theme-accent);
	}
	.thirds:hover .bar {
		background-color: var(--theme-highlight);
	}

	.vertical-bar {
		width: 2px;
		background-color: var(--theme-bg-tertiary);
		margin: 1em;
		margin-top: 2em;
		margin-bottom: 2em;
		border-radius: 0.05em;
		transition: all var(--transition-length);
	}

	.flex-container:hover .vertical-bar {
		background-color: var(--theme-accent);
	}

	.edu-div {
		margin-bottom: 2em;
	}

	.column {
		flex: 1;
		text-wrap: wrap;
	}

	.work-card {
		margin: 0.5em;
		width: 42%;
		transition: all var(--transition-length);
		max-height: 120px;
		overflow: hidden;
		border: 2px solid var(--theme-bg-primary);
		border-radius: var(--theme-img-border-radius);
		padding-left: 1em;
	}

	@media (max-width: 600px) {
		.work-card {
			width: 90%;
		}
	}

	.work-card ul {
		display: none;
	}

	.work-card:hover {
		max-height: 600px;
		border-color: var(--theme-accent);
	}
	.work-card:hover ul {
		display: block;
	}
</style>
