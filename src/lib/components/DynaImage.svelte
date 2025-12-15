<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const images: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});

	let { src, alt, caption, scaleFactor, paddingCount } = $props();

	function findClosest(value: number, array: Array<number>) {
		let closest = array[0];
		array.forEach((item) => {
			if (Math.abs(Number(item) - Number(value)) < Math.abs(Number(closest) - Number(value))) {
				closest = item;
			}
		});
		return closest;
	}

	function findClosestNoOver(value: number, array: Array<number>) {
		let closest = array[0];
		array.forEach((item) => {
			if (Math.abs(Number(item) - Number(value)) < Math.abs(Number(closest) - Number(value))) {
				closest = item;
			}
		});
		if (closest < value) {
			closest = array[Math.max(0, array.indexOf(closest) - 1) + 1];
		}
		return closest;
	}

	function findClosestNoUnder(value: number, array: Array<number>) {
		let closest = array[0];
		array.forEach((item) => {
			if (Math.abs(Number(item) - Number(value)) < Math.abs(Number(closest) - Number(value))) {
				closest = item;
			}
		});
		if (closest > value) {
			closest = array[Math.max(0, array.indexOf(closest) - 1)];
		}
		return closest;
	}

	function innerWidthScale(width: number) {
		return width < 600 ? width : width * 0.7;
	}

	const displayWidths = [
		90, 95, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		1300, 1400, 1500
	];
	const thumbSizes = [150, 225, 320, 480, 640, 960, 1280, 1920, 2560]; //see python thumbnailer for sizes

	// Calculate initial width using CSS calc() - works immediately without JS
	let scaledFactor = $derived(Number(scaleFactor));
	let paddingFactor = $derived(0.75 - Math.pow(2, Number(paddingCount)) * 0.05);
	let cssWidth = $derived(
		`clamp(90px, calc(min(100vw, 70vw) * ${scaledFactor} * ${paddingFactor}), 1500px)`
	);

	let isInitialized = $state(false); // Has the component been initial loaded? if not, we use placeholder
	let isLoaded = $state(false); // Has the image finished loading?
	let error = $state<Error | null>(null);

	let imgElement: HTMLImageElement;
	let displayedImgUrl = $state<string | null>(null);

	function resolveImgUrl(src: string, width: number | null) {
		const basePath = '$lib/img/';
		const fullPath = basePath + src;
		const extIndex = src.lastIndexOf('.');
		const nameOnly = src.substring(0, extIndex);
		const extOnly = src.substring(extIndex);
		const thumbName = `${nameOnly}_w${width}${extOnly}`;
		const thumbPath = basePath + thumbName;

		if (thumbPath in images) {
			return images[thumbPath]();
		} else if (fullPath in images) {
			return images[fullPath]();
		} else {
			throw new Error(`Image not found: ${src}`);
		}
	}

	function loadandReplaceImg(imgUrl: string) {
		const newImg = new Image();
		newImg.src = imgUrl;
		newImg.onload = () => {
			displayedImgUrl = imgUrl;
			isLoaded = true;
			isInitialized = true;
		};
	}

	$effect(()=>{
		//load image when target src updates
		let targetwidth = 

	});
</script>

<svelte:window />

<div
	class="dyna-image"
	style="
		--scale-factor: {scaledFactor}; 
		--padding-factor: {paddingFactor}; 
		width: {cssWidth};
	"
>
	{#if !error}
		{#if !isInitialized && !isLoaded}
			<!-- Only show placeholder for initial load, not when switching sizes -->
			<div
				class="temp-pad"
				style="width: 100%; aspect-ratio:4/3; border-radius: var(--theme-img-border-radius);"
			>
				<p>Loading...</p>
			</div>
		{/if}
		<img
			bind:this={imgElement}
			src={displayedImgUrl}
			alt={alt !== '' ? alt : caption !== '' ? caption : ''}
			style="width: 100%; border-radius: var(--theme-img-border-radius); visibility: {isInitialized
				? 'visible'
				: 'hidden'}; {!isLoaded ? 'opacity: 0.7;' : ''}"
		/>
	{:else if error}
		<p>{error.message}</p>
	{/if}
	{#if caption !== ''}
		<p style="text-wrap: wrap; overflow-wrap: break-word; width: 100%;">{caption}</p>
	{/if}
</div>

<style>
	.dyna-image {
		display: flex;
		flex-direction: column;
		width: fit-content;
		/* Base width calculation - mobile first */
		--base-width: calc(100vw * var(--scale-factor, 1) * var(--padding-factor, 0.75));
	}

	/* Desktop scaling */
	@media (min-width: 768px) {
		.dyna-image {
			--base-width: calc(70vw * var(--scale-factor, 1) * var(--padding-factor, 0.75));
		}
	}

	.dyna-image img {
		transition: all var(--transition-length);
	}

	.temp-pad {
		background-color: var(--theme-bg-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
