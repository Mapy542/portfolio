<script lang="ts">
	import DynaImage from './DynaImage.svelte';

	export let SRCs: string[] = [];
	export let ALTs: string[] = [];
	export let captions: string[] = [];
	export let scaleFactor: string = '1';
	export let paddingCount: string = '0';

	$: interiorScaleFactor = (Number(scaleFactor) / (SRCs.length > 3 ? 4 : SRCs.length)) * 1.15;
</script>

<div class="dyna-gallery">
	{#each SRCs as SRC, i}
		<div class="dyna-gallery__images">
			<DynaImage
				src={SRC}
				alt={ALTs[i]}
				caption={captions[i]}
				scaleFactor={String(interiorScaleFactor)}
				{paddingCount}
			/>
		</div>
	{/each}
</div>

<style>
	.dyna-gallery {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.dyna-gallery__images {
		flex: 1;
		display: flex;
		justify-content: center;
	}
</style>
