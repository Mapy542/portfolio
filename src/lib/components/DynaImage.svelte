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

	let imageUrl: string | null = null;
	let error: Error | null = null;
	let isLoaded = false;

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
	let imgWidth = widths[0];

	onMount(() => {
		// Set initial width
		innerWidth = window.innerWidth;
		imgWidth = findClosest(
			innerWidthScale(innerWidth) * Number(scaleFactor) * (0.75 - 2 ** Number(paddingCount) * 0.05),
			widths
		);

		// Update width on window resize
		window.addEventListener('resize', () => {
			innerWidth = window.innerWidth;
			imgWidth = findClosest(
				innerWidthScale(innerWidth) *
					Number(scaleFactor) *
					(0.75 - 2 ** Number(paddingCount) * 0.05),
				widths
			);
		});
	});

	$: {
		if (src) {
			const importImage = images[`/src/lib/img/${src}`];
			if (importImage) {
				importImage()
					.then((module: any) => {
						imageUrl = module.default;
					})
					.catch((err: Error) => {
						error = err;
					});
			} else {
				error = new Error('Image not found');
				console.error('Image not found:', src);
			}
		}
	}
</script>

<svelte:window bind:innerWidth />

<div class="dyna-image">
	{#if imageUrl}
		{#if !isLoaded}
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
				: 'hidden'};"
			on:load={() => {
				isLoaded = true;
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
