<script>
	import DynaImage from '$lib/components/DynaImage.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<svelte:head>
	<title>Home</title>
	<meta
		name="description"
		content="Bukoski.dev - Personal engineering project portfolio and blog."
	/>
	<meta name="keywords" content="engineering, software, design, projects, portfolio, blog" />
	<meta name="author" content="Eli Bukoski" />
</svelte:head>

<h1>Bukoski.dev</h1>
<p>
	Home of engineering project blogs and documentation. Here, you'll find projects that reflect my
	passion for clean, efficient designs and smart problem-solving. I love taking on complex
	challenges and finding elegant solutions, whether on a team or solo. Take a look to see how I
	bring ideas to life!
</p>

<div class="flex-columns">
	<div class="seconds">
		<h2>Biography</h2>
		<p>A little bit more about <a href="eli">me</a>.</p>
	</div>
	<div class="seconds">
		<h2>Projects</h2>
		<p>Some of the projects I've worked on.</p>
	</div>
</div>
<div class="spacer" style="height: 10em;"></div>
<div class="flex-columns">
	<div class="thirds">
		<h2>Discover Projects</h2>
		<p>Randomly selected projects for you:</p>
	</div>
	{#each data.props.docProps as doc}
		<div class="thirds">
			<a href={doc.link}>
				<h3>{doc.title}</h3>
				<DynaImage src={doc.image} alt={doc.title} scaleFactor=".3" paddingCount="1" />
				<p>{doc.description}</p>
			</a>
		</div>
	{/each}
</div>

<style>
	h1 {
		width: 100%;
	}
</style>
