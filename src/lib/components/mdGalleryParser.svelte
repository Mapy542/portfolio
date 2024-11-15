<script lang="ts">
	import DynaGallery from './DynaGallery.svelte';
	import MdBasicParser from './mdBasicParser.svelte';

	export let markdownString = '';
	export let columnRatioPassThrough = '1';
	export let inColumnCountPassThrough = '0';

	let dynaGalleryPreProcess: { SRC: string[]; ALT: string[]; captions: string[] }[] = [];

	$: {
		//reactive markdown pre-processor for galleries
		let inGallery = false;
		let index = 0;
		for (let line of markdownString.split('\n')) {
			if (line.startsWith('#!')) {
				index = inGallery ? index + 1 : index; //increment index if inGallery to setup next gallery
				inGallery = !inGallery; //toggle inGallery
			}
			if (inGallery) {
				if (dynaGalleryPreProcess[index] == undefined) {
					dynaGalleryPreProcess[index] = { SRC: [], ALT: [], captions: [] };
				}
				try {
					dynaGalleryPreProcess[index].SRC.push(line.split('(')[1].split(')')[0]);
					try {
						dynaGalleryPreProcess[index].ALT.push(line.split('[')[1].split(']')[0]);
					} catch (error) {
						dynaGalleryPreProcess[index].ALT.push('');
					}
					try {
						dynaGalleryPreProcess[index].captions.push(line.split('{')[1].split('}')[0]);
					} catch (error) {
						dynaGalleryPreProcess[index].captions.push('');
					}
				} catch (error) {}
			}
		}
	}
</script>

{#each markdownString.split('#!g') as mdBlock, index}
	{#if index == 0 || index % 2 == 0}
		<MdBasicParser
			markdownString={mdBlock}
			inColumnCount={inColumnCountPassThrough}
			columnRatio={columnRatioPassThrough}
		/>
	{:else}
		<DynaGallery
			SRCs={dynaGalleryPreProcess[index - 1].SRC}
			ALTs={dynaGalleryPreProcess[index - 1].ALT}
			captions={dynaGalleryPreProcess[index - 1].captions}
			scaleFactor={columnRatioPassThrough}
			paddingCount={inColumnCountPassThrough}
		/>
	{/if}
{/each}
