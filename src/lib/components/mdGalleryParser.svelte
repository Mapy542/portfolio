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
			if (line.startsWith('#!g')) {
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
				} catch (error) {
					console.log('Error in mdGalleryParser: ' + error);
				}
			}
		}
	}
</script>

{#each markdownString.split('#!g') as mdBlock, index}
	{#if index % 2 == 0}
		<MdBasicParser
			markdownString={mdBlock}
			inColumnCount={inColumnCountPassThrough}
			columnRatio={columnRatioPassThrough}
		/>
	{:else}
		<DynaGallery
			SRCs={dynaGalleryPreProcess[Math.floor(index / 2)].SRC}
			ALTs={dynaGalleryPreProcess[Math.floor(index / 2)].ALT}
			captions={dynaGalleryPreProcess[Math.floor(index / 2)].captions}
			scaleFactor={columnRatioPassThrough}
			paddingCount={inColumnCountPassThrough}
		/>
	{/if}
{/each}
