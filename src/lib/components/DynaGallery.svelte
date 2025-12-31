<script lang="ts">
	import DynaImage from './DynaImage.svelte';
	import DynaVideo from './DynaVideo.svelte';

	export let SRCs: string[] = [];
	export let ALTs: string[] = [];
	export let captions: string[] = [];
	export let scaleFactor: string = '1';
	export let paddingCount: string = '0';

	let scaleFactors: number[] = [];
	let enlargedIndex: number | null = null;
	let imageElements: HTMLElement[] = [];

	$: interiorScaleFactor = (Number(scaleFactor) / (SRCs.length > 3 ? 4 : SRCs.length)) * 1.15;
	$: {
		if (scaleFactors.length !== SRCs.length) {
			scaleFactors = Array(SRCs.length).fill(interiorScaleFactor);
		}
	}

	function handleClick(index: number) {
		if (enlargedIndex === index) {
			enlargedIndex = null;
			scaleFactors[index] = interiorScaleFactor;
		} else {
			if (enlargedIndex !== null) {
				scaleFactors[enlargedIndex] = interiorScaleFactor;
			}
			enlargedIndex = index;
			scaleFactors[index] = 1;
		}

		if (imageElements[index]) {
			setTimeout(() => {
				imageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 300);
		}
		//scaleFactors = [...scaleFactors]; // Trigger reactivity
	}

	function handleOuterClick() {
		if (enlargedIndex !== null) {
			scaleFactors[enlargedIndex] = interiorScaleFactor;
			enlargedIndex = null;
			//scaleFactors = [...scaleFactors];
		}
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick(index);
		}
	}
</script>

<div class="dyna-gallery">
	{#each SRCs as SRC, i}
		<div
			class="dyna-gallery__images"
			bind:this={imageElements[i]}
			on:click={() => handleClick(i)}
			on:keydown={(e) => handleKeydown(e, i)}
			aria-roledescription="click to enlarge image or video, click outside to reset"
			role="button"
			tabindex="0"
		>
			{#if SRC.endsWith('.webm') || SRC.endsWith('.mp4')}
				<DynaVideo
					src={SRC}
					autoplay={false}
					scaleFactor={String(interiorScaleFactor)}
					{paddingCount}
					ariaLabel={captions[i]}
					poster={ALTs[i].includes('.') ? ALTs[i] : ''}
				/>
			{:else}
				<DynaImage
					src={SRC}
					alt={ALTs[i]}
					caption={captions[i]}
					scaleFactor={String(scaleFactors[i])}
					{paddingCount}
				/>
			{/if}
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
