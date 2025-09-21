<script lang="ts">
	import { onMount } from 'svelte';

	// Dynamic imports for videos and optional poster images
	const videos: any = import.meta.glob('$lib/vid/**/*.{webm,mp4,mov,ogg}', { eager: false });
	const postersImg: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});
	const postersVid: any = import.meta.glob('$lib/vid/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
	});

	// Core API (kept similar to DynaImage)
	export let src: string = '';
	export let caption: string = '';
	export let scaleFactor: string = '1';
	export let paddingCount: string = '0';

	// Aspect ratio handling: use a placeholder to reduce CLS
	// Provide a default expected aspect ratio; set to 'auto' to derive from metadata after load
	export let aspectRatio: string = '16/9'; // e.g., '16/9', '4/3', or 'auto'

	// Video-specific controls
	export let controls: boolean = true;
	export let autoplay: boolean = false;
	export let muted: boolean = true; // autoplay usually requires muted=true
	export let loop: boolean = false;
	export let playsinline: boolean = true;
	export let preload: 'none' | 'metadata' | 'auto' = 'metadata';

	// Optional poster (thumbnail) path relative to $lib/img or $lib/vid
	export let poster: string = '';

	// Accessibility label (videos don't use alt)
	export let ariaLabel: string = '';

	let videoUrl: string | null = null;
	let posterUrl: string | null = null;
	let error: Error | null = null;
	let isLoaded = false;
	let computedAspect: string = aspectRatio; // may update if aspectRatio === 'auto'

	let videoEl: HTMLVideoElement | null = null;

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

	let innerWidth = 0;
	let vidWidth = widths[0];

	onMount(() => {
		// Set initial width
		innerWidth = window.innerWidth;
		vidWidth = findClosest(
			innerWidthScale(innerWidth) * Number(scaleFactor) * (0.75 - 2 ** Number(paddingCount) * 0.05),
			widths
		);

		// Update width on window resize
		window.addEventListener('resize', () => {
			innerWidth = window.innerWidth;
			vidWidth = findClosest(
				innerWidthScale(innerWidth) *
					Number(scaleFactor) *
					(0.75 - 2 ** Number(paddingCount) * 0.05),
				widths
			);
		});
	});

	$: {
		// Reset state when src changes
		isLoaded = false;
		computedAspect = aspectRatio;

		if (src) {
			const slashCleaned = /^\//.test(src) ? src.slice(1) : src;
			const importVideo = videos[`/src/lib/vid/${slashCleaned}`];
			if (importVideo) {
				importVideo()
					.then((module: any) => {
						videoUrl = module.default;
					})
					.catch((err: Error) => {
						error = err;
					});
			} else {
				error = new Error('Video not found');
				console.error('Video not found:', src);
			}
		}

		if (poster) {
			const slashCleanedPoster = /^\//.test(poster) ? poster.slice(1) : poster;
			const importPosterImg = postersImg[`/src/lib/img/${slashCleanedPoster}`];
			const importPosterVid = postersVid[`/src/lib/vid/${slashCleanedPoster}`];
			const importPoster = importPosterImg ?? importPosterVid;
			if (importPoster) {
				importPoster()
					.then((module: any) => {
						posterUrl = module.default;
					})
					.catch((err: Error) => {
						// Poster failing is non-fatal; log for debugging
						console.warn('Poster import failed:', err);
					});
			}
		} else {
			posterUrl = null;
		}
	}

	function handleLoadedMetadata() {
		if (aspectRatio === 'auto' && videoEl) {
			const w = videoEl.videoWidth || 16;
			const h = videoEl.videoHeight || 9;
			computedAspect = `${w} / ${h}`;
		}
		isLoaded = true;
	}
</script>

<svelte:window bind:innerWidth />

<div class="dyna-video">
	{#if videoUrl}
		{#if !isLoaded}
			<div
				class="temp-pad"
				style="width:{vidWidth}px; aspect-ratio:{computedAspect}; border-radius: var(--theme-img-border-radius);"
			>
				<p>Loading…</p>
			</div>
		{/if}
		<video
			bind:this={videoEl}
			src={videoUrl}
			{controls}
			{autoplay}
			{muted}
			{loop}
			{playsinline}
			{preload}
			poster={posterUrl || undefined}
			aria-label={ariaLabel}
			style="width:{vidWidth}px; border-radius: var(--theme-img-border-radius); visibility: {isLoaded
				? 'visible'
				: 'hidden'};"
			on:loadedmetadata={handleLoadedMetadata}
		/>
	{:else if error}
		<p>{error.message}</p>
	{:else}
		<div
			class="temp-pad"
			style="width:{vidWidth}px; aspect-ratio:{computedAspect}; border-radius: var(--theme-img-border-radius);"
		>
			<p>Loading…</p>
		</div>
	{/if}

	{#if caption !== ''}
		<p style="text-wrap: wrap; overflow-wrap: break-word; width: {vidWidth}px;">{caption}</p>
	{/if}
</div>

<!--
Usage example:

<script>
  import DynaVideo from '$lib/components/DynaVideo.svelte';
</script>

<DynaVideo
  src="my-folder/demo.webm"          // relative to src/lib/vid
  poster="thumbs/demo.webp"          // relative to src/lib/img (or src/lib/vid)
  caption="Demo clip"
  aspectRatio="16/9"                 // or "4/3" or "auto"
  scaleFactor="1"
  paddingCount="0"
  controls={true}
  autoplay={false}
  muted={true}
  loop={false}
  playsinline={true}
  preload="metadata"
/>
-->

<style>
	.dyna-video {
		display: flex;
		flex-direction: column;
		width: fit-content;
	}

	.dyna-video video {
		transition: all var(--transition-length);
		display: block;
		max-width: 100%;
	}

	.temp-pad {
		background-color: var(--theme-bg-secondary);
	}
</style>
