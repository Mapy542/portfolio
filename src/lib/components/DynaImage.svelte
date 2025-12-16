<script lang="ts">
	import { onMount, untrack } from 'svelte';

	const images: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});

	let { src, alt, caption, scaleFactor, paddingCount } = $props();

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

	const thumbSizes = [150, 225, 320, 480, 640, 960, 1280, 1920, 2560]; //see python thumbnailer for sizes

	// Calculate initial width using CSS calc() - works immediately without JS
	let scaledFactor = $derived(Number(scaleFactor));
	let paddingFactor = $derived(0.75 - Math.pow(2, Number(paddingCount)) * 0.05);
	let cssWidth = $derived(`clamp(90px, calc(70vw * ${scaledFactor} * ${paddingFactor}), 2560px)`);

	let zoomLevel = $state(1); // Current zoom level
	let windowWidth = $state<number>(1080);

	let loadTriggered = $state(false); // Has the image load been triggered?
	let isInitialized = $state(false); // Has the component been initial loaded? if not, we use placeholder
	let isLoaded = $state(false); // Has the image finished loading?
	let error = $state<Error | null>(null);

	let dynaImageContainer: HTMLDivElement;
	let displayedImgUrl = $state<string | null>(null);

	onMount(() => {
		///Intersection Observer
		const options = {
			rootMargin: '100px' //trigger before fully in view
		};
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					loadTriggered = true;
					observer.unobserve(dynaImageContainer);
				}
			});
		}, options);
		observer.observe(dynaImageContainer);

		//Zoom detection interval
		const zoomInterval = setInterval(() => {
			detectZoomLevel();
		}, 1000);
	});

	function srcSanitization(src: string) {
		let sanitizedSrc = src.startsWith('/') ? src.slice(1) : src;
		return sanitizedSrc;
	}

	async function resolveImgUrl(src: string, width: number | null) {
		const basePath = '/src/lib/img/';
		const thumgExt = width ? `thumb/${width}/` : '';
		const fullPath = basePath + thumgExt + srcSanitization(src);

		try {
			return images[fullPath]().then((mod: any) => mod.default);
		} catch (e) {
			error = new Error(`Image not found: ${fullPath}`);
			return null;
		}
	}

	async function loadandReplaceImg(imgUrl: Promise<string>) {
		isLoaded = false;
		const newImg = new Image();
		newImg.src = await imgUrl;
		newImg.onload = () => {
			setTimeout(() => {
				isLoaded = true;
			}, 100); //small delay to allow for transition
			displayedImgUrl = newImg.src;
			//isLoaded = true;
			isInitialized = true;
		};
	}

	function innerWidthScale(width: number) {
		return width < 600 ? width : width * 0.7;
	}

	function jsEmulateCssWidth(scaleFactor: number, paddingFactor: number, winWidth: number) {
		let baseWidth = innerWidthScale(winWidth);
		return Math.min(2560, Math.max(90, baseWidth * scaleFactor * paddingFactor));
	}

	$effect(() => {
		if (!isInitialized && loadTriggered) {
			//load image when target src updates
			const targetPagewidth = jsEmulateCssWidth(scaledFactor, paddingFactor, windowWidth);
			const requestThumbWidth = findClosestNoOver(targetPagewidth, thumbSizes);
			try {
				const imgUrlPromise = resolveImgUrl(src, requestThumbWidth);
				if (!imgUrlPromise) return;
				loadandReplaceImg(imgUrlPromise);
			} catch (e) {
				error = e as Error;
			}
		}
	});
	$effect(() => {
		const targetPagewidth = jsEmulateCssWidth(scaledFactor, paddingFactor, windowWidth * zoomLevel);
		const requestThumbWidth = findClosestNoOver(targetPagewidth, thumbSizes);
		if (isInitialized && untrack(() => isLoaded) && loadTriggered) {
			try {
				const imgUrlPromise = resolveImgUrl(src, requestThumbWidth);
				if (imgUrlPromise === null) return;
				loadandReplaceImg(imgUrlPromise);
				error = null;
			} catch (e) {
				error = e as Error;
			}
		}
	});

	//zoom detetction
	function detectZoomLevel() {
		if (typeof window === 'undefined') return;

		let detectedZoom = 1;

		// Method 1: Visual viewport (works well on mobile Safari/Chrome for pinch zoom)
		if (window.visualViewport) {
			const viewportZoom = window.outerWidth / window.visualViewport.width;
			if (viewportZoom > 1.02) {
				// Only use if significantly different from 1
				detectedZoom = viewportZoom;
			}
		}

		// Method 2: Compare document element to window (works better on desktop)
		if (detectedZoom === 1) {
			const docElement = document.documentElement;
			if (docElement) {
				const computedZoom = window.outerWidth / window.innerWidth;
				if (computedZoom > 1.02 && computedZoom < 10) {
					// Reasonable zoom range
					detectedZoom = computedZoom;
				}
			}
		}

		// Method 3: Use devicePixelRatio changes (for browser zoom on desktop)
		if (detectedZoom === 1) {
			const baseDevicePixelRatio = window.devicePixelRatio || 1;
			// Store the initial DPR to detect changes
			if (!(window as any).__initialDPR) {
				(window as any).__initialDPR = baseDevicePixelRatio;
			}
			const zoomFromDPR = baseDevicePixelRatio / (window as any).__initialDPR;
			if (Math.abs(zoomFromDPR - 1) > 0.02) {
				detectedZoom = zoomFromDPR;
			}
		}

		// Method 4: CSS media queries (fallback for desktop zoom detection)
		if (detectedZoom === 1 && typeof window !== 'undefined') {
			// Use a test element to detect zoom via CSS
			const testDiv = document.createElement('div');
			testDiv.style.position = 'fixed';
			testDiv.style.top = '-1000px';
			testDiv.style.width = '100vw';
			testDiv.style.height = '1px';
			document.body.appendChild(testDiv);

			const vwInPixels = testDiv.offsetWidth;
			document.body.removeChild(testDiv);

			if (vwInPixels && window.innerWidth) {
				const cssZoom = vwInPixels / window.innerWidth;
				if (Math.abs(cssZoom - 1) > 0.02) {
					detectedZoom = 1 / cssZoom; // Inverse because zoom makes vw smaller
				}
			}
		}

		// Apply zoom level with some smoothing to avoid constant updates
		const newZoom = Math.round(detectedZoom * 100) / 100; // Round to 2 decimal places
		if (Math.abs(newZoom - zoomLevel) > 0.05) {
			// Only update if change is significant
			zoomLevel = newZoom;
		}
	}
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div
	class="dyna-image"
	style="
		--scale-factor: {scaledFactor}; 
		--padding-factor: {paddingFactor}; 
		width: {cssWidth};
	"
	bind:this={dynaImageContainer}
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
