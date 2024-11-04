<script>
	import DynaImage from './DynaImage.svelte';
	export let markdownString = '';
</script>

{#if markdownString !== ''}
	{#each markdownString.split('\n') as line, index}
		{#if line === '' || line.startsWith('#!')}
			<!--br-->
		{:else if line.startsWith('# ')}
			<h1>{line.replace('# ', '')}</h1>
		{:else if line.startsWith('## ')}
			<h2>{line.replace('## ', '')}</h2>
		{:else if line.startsWith('### ')}
			<h3>{line.replace('### ', '')}</h3>
		{:else if line.startsWith('#### ')}
			<h4>{line.replace('#### ', '')}</h4>
		{:else if line.startsWith('##### ')}
			<h5>{line.replace('##### ', '')}</h5>
		{:else if line.startsWith('###### ')}
			<h6>{line.replace('###### ', '')}</h6>
		{:else if line.startsWith('![')}
			<DynaImage
				src={line.split('(')[1].split(')')[0]}
				alt={line.split('[')[1].split(']')[0]}
				caption={line.split('{')[1].split('}')[0]}
			/>
		{:else}
			<p>{line}</p>
		{/if}
	{/each}
{/if}
