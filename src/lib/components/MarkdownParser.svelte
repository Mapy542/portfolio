<script>
	import MdGalleryParser from './mdGalleryParser.svelte';
	import MdCodeParser from './mdCodeParser.svelte';
	import hljs from 'highlight.js';
	import 'highlight.js/styles/github.css';
	import { onMount } from 'svelte';

	export let markdownString = '';
	let mdPostProcessed = '';

	onMount(() => {
		hljs.highlightAll();
	});

	$: {
		//reactive markdown pre-processor for columns
		let inColumnGroup = false;
		for (let i = 0; i < markdownString.length; i++) {
			if (
				markdownString[i] == '#' &&
				markdownString[i + 1] == '%' &&
				markdownString[i + 2] == ' '
			) {
				//found a column start processing
				if (!inColumnGroup) {
					inColumnGroup = true;
					mdPostProcessed += '#% \n'; //start column group
				}
				mdPostProcessed += '#^' + markdownString.substring(i + 3, i + 6) + '\n'; //start column with size inplaced
				i += 6;

				for (let j = i + 3; j < markdownString.length; j++) {
					if (
						markdownString[j] == '#' &&
						markdownString[j + 1] == '%' &&
						markdownString[j + 2] == ' '
					) {
						//found another column continue adding under new column
						//mdPostProcessed += '#^ \n';
						mdPostProcessed += '#^' + markdownString.substring(j + 3, j + 6) + '\n';
						i = j + 6;
						break;
					} else if (
						markdownString[j] == '#' &&
						markdownString[j + 1] == '%' &&
						(markdownString[j + 2] == '\n' || markdownString[j + 3] == '\n')
					) {
						//found end of column group
						//mdPostProcessed += '#^ \n';
						mdPostProcessed += '#% \n';
						inColumnGroup = false;
						i = j + 2;
						break;
					} else {
						mdPostProcessed += markdownString[j];
					}
				}
			} else if (
				markdownString[i] == '#' &&
				markdownString[i + 1] == '%' &&
				markdownString[i + 2] == '\n'
			) {
				//found end of column group
				mdPostProcessed += '#% \n'; //this is the beginning of the next column group??
				inColumnGroup = false;
				i += 2;
			} else {
				mdPostProcessed += markdownString[i];
			}
		}
	}
</script>

{#if mdPostProcessed !== ''}
	<div class="md-content">
		{#each mdPostProcessed.split('#%') as columnGroup, index}
			{#if index != 0 && index != mdPostProcessed.split('#%').length - 1}
				<div class="flex-columns">
					{#each columnGroup.split('#^').slice(1) as column, index2}
						<div
							class={columnGroup.split('#^')[index2 + 1].substring(0, 3) === '1,3'
								? 'thirds'
								: columnGroup.split('#^')[index2 + 1].substring(0, 3) === '1,2'
									? 'seconds'
									: 'two-thirds'}
						>
							{#each column.substring(3).split('```') as codeBlock, index3}
								{#if index3 % 2 == 1}
									<MdCodeParser markdownString={codeBlock} />
								{:else}
									<MdGalleryParser
										markdownString={codeBlock}
										columnRatioPassThrough={String(
											Number(columnGroup.split('#^')[index2 + 1].substring(0, 3)[0]) /
												Number(columnGroup.split('#^')[index2 + 1].substring(0, 3)[2])
										)}
										inColumnCountPassThrough="1"
									/>
								{/if}
							{/each}
						</div>
					{/each}
				</div>
			{:else}
				{#each columnGroup.split('```') as codeBlock, index3}
					{#if index3 % 2 == 1}
						<MdCodeParser markdownString={codeBlock} />
					{:else}
						<MdGalleryParser markdownString={codeBlock} />
					{/if}
				{/each}
			{/if}
		{/each}
	</div>
{/if}
