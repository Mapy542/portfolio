<script lang="ts">
	import { onMount } from 'svelte';

	const images: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});

	export let src: string = '';
	export let alt: string = '';
	export let caption: string = '';
	export let scaleFactor: string = '1';
	export let paddingCount: string = '0';

	// Shared cache across all instances
	let imageCache: Map<string, string>;
	if (typeof window !== 'undefined') {
		if (!window.__dynaImageCache) {
			window.__dynaImageCache = new Map();
		}
		imageCache = window.__dynaImageCache;
	}

	let imageUrl: string | null = null;
	let error: Error | null = null;
	let isLoaded = false;
	let loadingKey = '';
	let isLoadingNewSize = false; // Track when we're loading a different size

	function findClosest(value: Number, array: Array<Number>) {
		let closest = array[0];
		array.forEach((item) => {
			if (Math.abs(Number(item) - Number(value)) < Math.abs(Number(closest) - Number(value))) {
				closest = item;
			}
		});
		return closest;
	}

	function innerWidthScale(width: number) {
		return width < 768 ? width : width * 0.7;
	}

	const widths = [
		90, 95, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		1300, 1400, 1500
	];

	const thumbSizes = [
		90, 95, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		1300, 1400, 1500
	]; //see python thumbnailer for sizes

	let innerWidth = 0;
	let imgWidth = widths[0];
	let resizeTimeout: number;

	function updateImageSize() {
		imgWidth = findClosest(
			innerWidthScale(innerWidth) * Number(scaleFactor) * (0.75 - 2 ** Number(paddingCount) * 0.05),
			widths
		);
	}

	onMount(() => {
		innerWidth = window.innerWidth;
		updateImageSize();

		// Debounced resize handler
		function handleResize() {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				innerWidth = window.innerWidth;
				updateImageSize();
			}, 50);
		}

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
		};
	});

	$: {
		if (src && typeof window !== 'undefined') {
			const slashCleanedsrc = /^\//.test(src) ? src.slice(1) : src;
			let thumbRedirect = '';

			if (imgWidth <= thumbSizes[thumbSizes.length - 1]) {
				const thumbWidth = findClosest(imgWidth, thumbSizes);
				thumbRedirect = `thumb/${thumbWidth}/`;
			}

			const imageKey = `/src/lib/img/${thumbRedirect}${slashCleanedsrc}`;

			// Only proceed if this is a new image key
			if (loadingKey !== imageKey) {
				loadingKey = imageKey;

				// Check cache first
				if (imageCache && imageCache.has(imageKey)) {
					imageUrl = imageCache.get(imageKey)!;
					// Don't set isLoaded=true yet - wait for img onload event
					isLoadingNewSize = false;
				} else {
					// Don't reset loading state if we already have an image (different size)
					// Only show placeholder if this is the very first load
					if (!imageUrl) {
						isLoaded = false;
					} else {
						isLoadingNewSize = true; // We're loading a new size, keep old image visible
					}
					error = null;

					const importImage = images[imageKey];
					if (importImage) {
						importImage()
							.then((module: any) => {
								const url = module.default;
								if (imageCache) {
									imageCache.set(imageKey, url);
								}
								// Only update if this is still the current request
								if (loadingKey === imageKey) {
									imageUrl = url;
									isLoaded = true;
									isLoadingNewSize = false;
								}
							})
							.catch((err: Error) => {
								if (loadingKey === imageKey) {
									error = err;
									isLoadingNewSize = false;
								}
							});
					} else {
						error = new Error('Image not found');
						console.error('Image not found:', src);
						isLoadingNewSize = false;
					}
				}
			}
		}
	}
</script>

<svelte:window bind:innerWidth />

<div class="dyna-image">
	{#if imageUrl}
		{#if !isLoaded && !isLoadingNewSize}
			<!-- Only show placeholder for initial load, not when switching sizes -->
			<div
				class="temp-pad"
				style="width:{imgWidth}px; aspect-ratio:4/3; border-radius: var(--theme-img-border-radius);"
			>
				<p>Loading...</p>
			</div>
		{/if}
		<img
			src={imageUrl}
			alt={alt !== '' ? alt : caption !== '' ? caption : ''}
			loading="lazy"
			style="width:{imgWidth}px; border-radius: var(--theme-img-border-radius); visibility: {isLoaded
				? 'visible'
				: 'hidden'}; {isLoadingNewSize ? 'opacity: 0.7;' : ''}"
			on:load={() => {
				isLoaded = true;
				isLoadingNewSize = false;
			}}
		/>
	{:else if error}
		<p>{error.message}</p>
	{:else}
		<div
			class="temp-pad"
			style="width:{imgWidth}px; aspect-ratio:4/3; border-radius: var(--theme-img-border-radius);"
		>
			<p>Loading...</p>
		</div>
	{/if}
	{#if caption !== ''}
		<p style="text-wrap: wrap; overflow-wrap: break-word; width: {imgWidth}px;">{caption}</p>
	{/if}
</div>

<style>
	.dyna-image {
		display: flex;
		flex-direction: column;
		width: fit-content;
	}

	.dyna-image img {
		transition: all var(--transition-length);
	}
	.temp-pad {
		background-color: var(--theme-bg-secondary);
	}
</style>
