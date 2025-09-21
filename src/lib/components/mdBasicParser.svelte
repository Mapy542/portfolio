<script>
	import DynaImage from './DynaImage.svelte';
	import DynaVideo from './DynaVideo.svelte';
	import MdSublineParser from './mdSublineParser.svelte';
	export let markdownString = '';
	export let inColumnCount = '0';
	export let columnRatio = '.5';

	function hasFileEnding(str) {
		return /\(.*?\..*?\)/.test(str);
	}
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
		{:else if line.startsWith('!')}
			{#if line.includes('.webm') || line.includes('.mp4')}
				<DynaVideo
					src={line.split('(')[1].split(')')[0]}
					autoplay={false}
					scaleFactor={columnRatio}
					paddingCount={inColumnCount}
					poster={line.includes('[') && line.includes(']') ? line.split('[')[1].split(']')[0] : ''}
					ariaLabel={line.includes('{') && line.includes('}')
						? line.split('{')[1].split('}')[0]
						: ''}
				/>
			{:else}
				<DynaImage
					src={line.split('(')[1].split(')')[0]}
					alt={line.includes('[') && line.includes(']') ? line.split('[')[1].split(']')[0] : ''}
					caption={line.includes('{') && line.includes('}') ? line.split('{')[1].split('}')[0] : ''}
					scaleFactor={columnRatio}
					paddingCount={inColumnCount}
				/>
			{/if}
		{:else if line.startsWith('[') && line.includes(')')}
			{#if hasFileEnding(line) && !line.includes('http')}
				<p>
					<a href={line.split('(')[1].split(')')[0]} download
						>{line.split('[')[1].split(']')[0]}
					</a>
				</p>
			{:else}
				<p>
					<a
						href={line.split('(')[1].split(')')[0]}
						data-sveltekit-preload-code
						data-sveltekit-reload
						>{line.split('[')[1].split(']')[0]}
					</a>
				</p>
			{/if}
		{:else if line !== '' && line !== ' ' && line !== '\r'}
			<MdSublineParser markdownString={line} />
		{/if}
	{/each}
{/if}

<style>
	p {
		margin-bottom: 2em;
	}
</style>
