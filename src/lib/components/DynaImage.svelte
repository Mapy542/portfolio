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
	let pendingImageKey = ''; // Track what we want to load but haven't started yet

	function findClosest(value: Number, array: Array<Number>) {
		let closest = array[0];
		array.forEach((item) => {
			if (Math.abs(Number(item) - Number(value)) < Math.abs(Number(closest) - Number(value))) {
				closest = item;
			}
		});
		return closest;
	}

	function findClosestNoOver(value: Number, array: Array<Number>) {
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

	function innerWidthScale(width: number) {
		return width < 768 ? width : width * 0.7;
	}

	const widths = [
		90, 95, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		1300, 1400, 1500
	];

	const thumbSizes = [100, 200, 300, 500, 800, 1000, 1200, 1400, 1500]; //see python thumbnailer for sizes

	let innerWidth = 0;
	let imgWidth = widths[0];
	let resizeTimeout: number;

	// Calculate initial width using CSS calc() - works immediately without JS
	$: scaledFactor = Number(scaleFactor);
	$: paddingFactor = 0.75 - Math.pow(2, Number(paddingCount)) * 0.05;
	$: cssWidth = `clamp(90px, calc(min(100vw, 70vw) * ${scaledFactor} * ${paddingFactor}), 1500px)`;

	function updateImageSize() {
		imgWidth = findClosest(
			innerWidthScale(innerWidth) * Number(scaleFactor) * (0.75 - 2 ** Number(paddingCount) * 0.05),
			widths
		);
	}

	let imgElement: HTMLImageElement;
	let placeholderElement: HTMLDivElement;
	function loadImage(imageKey: string) {
		if (loadingKey === imageKey) return; // Already loading this image

		loadingKey = imageKey;

		// Check cache first
		if (imageCache && imageCache.has(imageKey)) {
			imageUrl = imageCache.get(imageKey)!;
			isLoaded = true; // Cached images can be marked loaded immediately
			isLoadingNewSize = false;
			return;
		}

		// For new images that need to be fetched
		if (!imageUrl) {
			isLoaded = false; // First time load - show placeholder
		} else {
			isLoadingNewSize = true; // Size change - keep old image visible
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
						// Don't set isLoaded here - let the img onload event handle it
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

		// Set up intersection observer for lazy loading
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && pendingImageKey) {
						loadImage(pendingImageKey);
						observer.unobserve(entry.target); // Stop observing after loading
					}
				});
			},
			{
				rootMargin: '50px' // Start loading 50px before image comes into view
			}
		);

		// Function to observe elements as they become available
		function observeElement() {
			if (placeholderElement) {
				observer.observe(placeholderElement);
			} else if (imgElement) {
				observer.observe(imgElement);
			}
		}

		// Initial observation
		observeElement();

		// Re-observe when elements change (use a small delay to ensure DOM is updated)
		const observeInterval = setInterval(observeElement, 100);

		return () => {
			window.removeEventListener('resize', handleResize);
			clearTimeout(resizeTimeout);
			observer.disconnect();
			clearInterval(observeInterval);
		};
	});

	$: {
		if (src && typeof window !== 'undefined') {
			const slashCleanedsrc = /^\//.test(src) ? src.slice(1) : src;
			let thumbRedirect = '';

			if (imgWidth <= thumbSizes[thumbSizes.length - 1]) {
				const thumbWidth = findClosestNoOver(imgWidth, thumbSizes);
				thumbRedirect = `thumb/${thumbWidth}/`;
			}

			const imageKey = `/src/lib/img/${thumbRedirect}${slashCleanedsrc}`;

			// Store what we want to load, but don't load it yet (let lazy loading handle it)
			pendingImageKey = imageKey;

			// If it's cached, load immediately since there's no network cost
			if (imageCache && imageCache.has(imageKey)) {
				loadImage(imageKey);
			}
			// Otherwise, wait for the intersection observer to trigger loading
		}
	}
</script>

<svelte:window bind:innerWidth />

<div
	class="dyna-image"
	style="
		--scale-factor: {scaledFactor}; 
		--padding-factor: {paddingFactor}; 
		width: {cssWidth};
	"
>
	{#if imageUrl}
		{#if !isLoaded && !isLoadingNewSize}
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
			src={imageUrl}
			alt={alt !== '' ? alt : caption !== '' ? caption : ''}
			loading="lazy"
			style="width: 100%; border-radius: var(--theme-img-border-radius); visibility: {isLoaded
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
		<!-- Show placeholder that will trigger intersection observer -->
		<div
			bind:this={placeholderElement}
			class="temp-pad"
			style="width: 100%; aspect-ratio:4/3; border-radius: var(--theme-img-border-radius);"
		>
			<p>Loading...</p>
		</div>
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
