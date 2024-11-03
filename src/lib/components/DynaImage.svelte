<script lang="ts">
	const images: any = import.meta.glob('$lib/img/**/*.{jpg,jpeg,png,gif,webp}', {
		eager: false
		//query: '?url',
		//import: 'default'
	});

	export let src: string = '';
	export let alt: string = '';
	export let caption: string = '';
	export let size: string = 'auto';

	let innerWidth = 0;
	$: autosize = Math.min(Math.max(Math.round((innerWidth !== 0 ? innerWidth : 1000) / 400), 1), 5);

	let imageUrl: string | null = null;
	let error: Error | null = null;
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
			}
		}
	}
</script>

<svelte:window bind:innerWidth />

<div class="dyna-image">
	{#if imageUrl}
		<img
			src={imageUrl}
			alt={alt !== '' ? alt : caption !== '' ? caption : ''}
			class={'size-' + (size === 'auto' ? autosize : Number(size) % 6)}
			loading="lazy"
			style="border-radius: var(--theme-img-border-radius);"
		/>
	{:else if error}
		<p>{error.message}</p>
	{:else}
		<div
			class={'temp-pad size-' + (size === 'auto' ? autosize : Number(size) % 6)}
			style="aspect-ratio:16/9; border-radius: var(--theme-img-border-radius);"
		>
			<p>Loading...</p>
		</div>
	{/if}
	{#if caption !== ''}
		<p>{caption}</p>
	{/if}
</div>

<style>
	.dyna-image {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.size-1 {
		width: 150px;
	}

	.size-2 {
		width: 300px;
	}

	.size-3 {
		width: 500px;
	}

	.size-4 {
		width: 700px;
	}

	.size-5 {
		width: 900px;
	}
	.temp-pad {
		background-color: var(--theme-mid);
	}
</style>
