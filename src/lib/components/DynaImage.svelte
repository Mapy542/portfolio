<script lang="ts">
	import { onMount } from 'svelte';

	const images: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});

	// Global Event Manager for all DynaImage instances
	class DynaImageEventManager {
		static instances = new Set<any>();
		static initialized = false;
		static resizeTimeout: number;
		static zoomTimeout: number;

		static register(instance: any) {
			this.instances.add(instance);
			if (!this.initialized) this.initializeEvents();
		}

		static unregister(instance: any) {
			this.instances.delete(instance);
			if (this.instances.size === 0) {
				this.cleanup();
			}
		}

		static notifyResize() {
			this.instances.forEach(instance => instance.handleResize());
		}

		static notifyZoomChange() {
			this.instances.forEach(instance => instance.handleZoomChange());
		}

		static initializeEvents() {
			if (this.initialized || typeof window === 'undefined') return;
			this.initialized = true;

			// Debounced resize handler
			const handleResize = () => {
				clearTimeout(this.resizeTimeout);
				this.resizeTimeout = setTimeout(() => this.notifyResize(), 50);
			};

			// Debounced zoom handler
			const handleZoomChange = () => {
				clearTimeout(this.zoomTimeout);
				this.zoomTimeout = setTimeout(() => this.notifyZoomChange(), 150);
			};

			window.addEventListener('resize', handleResize);

			// Zoom detection events
			if (window.visualViewport) {
				window.visualViewport.addEventListener('resize', handleZoomChange);
				window.visualViewport.addEventListener('scroll', handleZoomChange);
			}

			window.addEventListener('wheel', (e) => {
				if (e.ctrlKey || e.metaKey) {
					handleZoomChange();
				}
			}, { passive: true });

			// Touch events for mobile zoom
			let touchStartDistance = 0;
			window.addEventListener('touchstart', (e) => {
				if (e.touches.length === 2) {
					const touch1 = e.touches[0];
					const touch2 = e.touches[1];
					touchStartDistance = Math.hypot(
						touch1.clientX - touch2.clientX,
						touch1.clientY - touch2.clientY
					);
				}
			}, { passive: true });

			window.addEventListener('touchmove', (e) => {
				if (e.touches.length === 2 && touchStartDistance > 0) {
					const touch1 = e.touches[0];
					const touch2 = e.touches[1];
					const currentDistance = Math.hypot(
						touch1.clientX - touch2.clientX,
						touch1.clientY - touch2.clientY
					);
					if (Math.abs(currentDistance - touchStartDistance) > 50) {
						handleZoomChange();
					}
				}
			}, { passive: true });

			window.addEventListener('orientationchange', handleZoomChange);

			// Periodic check for zoom changes (fallback)
			const zoomCheckInterval = setInterval(() => this.notifyZoomChange(), 1000);
			this.zoomCheckInterval = zoomCheckInterval;
		}

		static cleanup() {
			if (!this.initialized) return;
			this.initialized = false;
			
			clearTimeout(this.resizeTimeout);
			clearTimeout(this.zoomTimeout);
			clearInterval(this.zoomCheckInterval);
			
			// Remove all event listeners
			// Note: We'd need to store references to clean these up properly
			// For now, they'll persist but won't have any instances to notify
		}

		static zoomCheckInterval: number;
	}

	export let src: string = '';
	export let alt: string = '';
	export let caption: string = '';
	export let scaleFactor: string = '1';
	export let paddingCount: string = '0';

	// Shared cache across all instances
	let imageCache: Map<string, string>;
	if (typeof window !== 'undefined') {
		if (!(window as any).__dynaImageCache) {
			(window as any).__dynaImageCache = new Map();
		}
		imageCache = (window as any).__dynaImageCache;
	}

	let imageUrl: string | null = null;
	let error: Error | null = null;
	let isLoaded = false;
	let loadingKey = '';
	let isLoadingNewSize = false; // Track when we're loading a different size
	let pendingImageKey = ''; // Track what we want to load but haven't started yet

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

	function innerWidthScale(width: number) {
		return width < 768 ? width : width * 0.7;
	}

	const widths = [
		90, 95, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1200,
		1300, 1400, 1500
	];

	const thumbSizes = [150, 225, 320, 480, 640, 960, 1280, 1920, 2560]; //see python thumbnailer for sizes

	let innerWidth = 0;
	let imgWidth = widths[0];
	let resizeTimeout: number;
	let loadingTimeout: number; // For debounced image loading
	let zoomLevel = 1; // Track effective zoom level
	let devicePixelRatio = 1; // Track device pixel ratio

	// Calculate initial width using CSS calc() - works immediately without JS
	$: scaledFactor = Number(scaleFactor);
	$: paddingFactor = 0.75 - Math.pow(2, Number(paddingCount)) * 0.05;
	$: cssWidth = `clamp(90px, calc(min(100vw, 70vw) * ${scaledFactor} * ${paddingFactor}), 1500px)`;

	// Granular Reactivity - Split by concern
	$: displaySize = calculateDisplaySize(innerWidth, scaleFactor, paddingCount);
	$: imageKey = deriveImageKey(src, imgWidth, zoomLevel, devicePixelRatio);
	$: if (imageKey && imageKey !== pendingImageKey) updatePendingImage(imageKey);

	function calculateDisplaySize(width: number, scale: string, padding: string) {
		return findClosest(
			innerWidthScale(width) * Number(scale) * (0.75 - Math.pow(2, Number(padding)) * 0.05),
			widths
		);
	}

	function deriveImageKey(srcPath: string, width: number, zoom: number, dpr: number): string {
		if (!srcPath || typeof window === 'undefined' || !width) return '';
		
		const slashCleanedsrc = /^\//.test(srcPath) ? srcPath.slice(1) : srcPath;
		let thumbRedirect = '';

		// Use zoom-aware resolution calculation
		const displayWidth = width;
		const effectiveZoom = zoom * dpr;
		const requiredWidth = Math.ceil(displayWidth * effectiveZoom);
		const requiredResolution = findClosest(requiredWidth, thumbSizes);

		if (Number(requiredResolution) <= thumbSizes[thumbSizes.length - 1]) {
			thumbRedirect = `thumb/${requiredResolution}/`;
		}

		return `/src/lib/img/${thumbRedirect}${slashCleanedsrc}`;
	}

	function updatePendingImage(newImageKey: string) {
		pendingImageKey = newImageKey;

		// If it's cached, load immediately since there's no network cost
		if (imageCache && imageCache.has(newImageKey)) {
			debouncedImageLoad(newImageKey, 0); // No delay for cached images
		}
		// Otherwise, wait for the intersection observer to trigger loading
	}

	function updateImageSize() {
		imgWidth = Number(findClosest(
			innerWidthScale(innerWidth) *
				Number(scaleFactor) *
				(0.75 - Math.pow(2, Number(paddingCount)) * 0.05),
			widths
		));
	}

	// Calculate the resolution we need based on display size and zoom
	function getRequiredResolution() {
		const displayWidth = imgWidth;
		// Factor in zoom level and device pixel ratio for crisp images
		const effectiveZoom = zoomLevel * devicePixelRatio;
		const requiredWidth = Math.ceil(displayWidth * effectiveZoom);

		// Find the closest thumbnail size that can handle this resolution
		return findClosest(requiredWidth, thumbSizes);
	}

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

		// Always update device pixel ratio
		devicePixelRatio = window.devicePixelRatio || 1;
	}

	let imgElement: HTMLImageElement;
	let placeholderElement: HTMLDivElement;

	// Request Debouncing - Debounced image loading function
	function debouncedImageLoad(src: string, delay: number = 150) {
		if (loadingTimeout) {
			clearTimeout(loadingTimeout);
		}
		
		loadingTimeout = setTimeout(() => {
			loadImage(src);
		}, delay);
	}

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
		// Generate unique component ID and register with event manager
		const componentId = `dyna-image-${Math.random().toString(36).substr(2, 9)}`;
		const instanceHandler = {
			handleResize: () => {
				innerWidth = window.innerWidth;
				updateImageSize();
				detectZoomLevel();
			},
			handleZoomChange: () => {
				detectZoomLevel();
			}
		};
		DynaImageEventManager.register(instanceHandler);

		innerWidth = window.innerWidth;
		updateImageSize();
		detectZoomLevel(); // Initial zoom detection

		// More aggressive zoom detection for different browsers
		function handleImmediateZoom() {
			detectZoomLevel();
		}

		// Periodic check for zoom changes (fallback)
		const zoomCheckInterval = setInterval(handleImmediateZoom, 1000);

		// Set up intersection observer for lazy loading
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && pendingImageKey) {
						debouncedImageLoad(pendingImageKey, 50); // Small delay for intersection-triggered loads
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
			DynaImageEventManager.unregister(instanceHandler);
			clearInterval(zoomCheckInterval);
			observer.disconnect();
			clearInterval(observeInterval);
			if (loadingTimeout) {
				clearTimeout(loadingTimeout);
			}
		};
	});


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
