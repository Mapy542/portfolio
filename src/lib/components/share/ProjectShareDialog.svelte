<script lang="ts">
	import { createEventDispatcher, tick } from 'svelte';

	export let open = false;
	export let title = 'Share project as URL';
	export let longHeading = 'Compressed share link';
	export let longDescription = '';
	export let longUrl = '';
	export let longStatus = '';
	export let shortHeading = 'Temporary short URL';
	export let shortDescription = '';
	export let shortUrl = '';
	export let shortStatus = '';
	export let shortEligible = true;
	export let shortPending = false;
	export let shortEmptyState = 'No temporary short URL has been created yet.';
	export let copyLongLabel = 'Copy URL';
	export let copyShortLabel = 'Copy Short URL';
	export let createShortLabel = 'Create Short URL';
	export let regenerateShortLabel = 'Regenerate Short URL';
	export let closeLabel = 'Close';
	export let doneLabel = 'Done';

	const dispatch = createEventDispatcher<{
		close: void;
		createshort: void;
	}>();

	let longField: HTMLTextAreaElement | null = null;
	let shortField: HTMLTextAreaElement | null = null;
	let longCopyStatus = '';
	let shortCopyStatus = '';
	let longStatusKey = '';
	let shortStatusKey = '';
	let wasOpen = false;
	let previousShortUrl = '';

	$: displayedLongStatus = longCopyStatus || longStatus;
	$: displayedShortStatus = shortCopyStatus || shortStatus;

	$: {
		const nextLongStatusKey = `${longUrl}\n${longStatus}`;

		if (nextLongStatusKey !== longStatusKey) {
			longStatusKey = nextLongStatusKey;
			longCopyStatus = '';
		}
	}

	$: {
		const nextShortStatusKey = `${shortUrl}\n${shortStatus}`;

		if (nextShortStatusKey !== shortStatusKey) {
			shortStatusKey = nextShortStatusKey;
			shortCopyStatus = '';
		}
	}

	$: if (open && !wasOpen) {
		wasOpen = true;
		void tick().then(() => {
			longField?.focus();
			longField?.select();
		});
	}

	$: if (!open && wasOpen) {
		wasOpen = false;
		longCopyStatus = '';
		shortCopyStatus = '';
		previousShortUrl = '';
	}

	$: if (open && shortUrl && shortUrl !== previousShortUrl) {
		previousShortUrl = shortUrl;
		void tick().then(() => {
			shortField?.focus();
			shortField?.select();
		});
	}

	async function copyValue(
		value: string,
		field: HTMLTextAreaElement | null,
		assignStatus: (value: string) => void
	) {
		if (!value) {
			return;
		}

		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(value);
				assignStatus('Share URL copied to clipboard.');
				return;
			} catch {
				// Fall back to selecting the text for manual copy.
			}
		}

		field?.focus();
		field?.select();
		assignStatus('Press Ctrl+C to copy the selected URL.');
	}

	async function copyLongUrl() {
		await copyValue(longUrl, longField, (value) => {
			longCopyStatus = value;
		});
	}

	async function copyShortUrl() {
		await copyValue(shortUrl, shortField, (value) => {
			shortCopyStatus = value;
		});
	}

	function closeDialog() {
		dispatch('close');
	}

	function handleBackdropClick() {
		closeDialog();
	}

	function handleDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDialog();
		}
	}

	function requestShortUrl() {
		dispatch('createshort');
	}
</script>

{#if open}
	<div class="share-dialog-backdrop" role="presentation" on:click={handleBackdropClick}>
		<div
			class="share-dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-project-title"
			tabindex="-1"
			on:click|stopPropagation
			on:keydown={handleDialogKeydown}
		>
			<div class="share-dialog__header">
				<div>
					<p class="share-dialog__eyebrow">Share</p>
					<h2 id="share-project-title">{title}</h2>
				</div>
				<button type="button" class="share-dialog__button" on:click={closeDialog}>
					{closeLabel}
				</button>
			</div>

			<section class="share-dialog__section">
				<div class="share-dialog__section-head">
					<div>
						<p class="share-dialog__eyebrow">Long URL</p>
						<h3>{longHeading}</h3>
					</div>
					<button
						type="button"
						class="share-dialog__button share-dialog__button--primary"
						on:click={copyLongUrl}
					>
						{copyLongLabel}
					</button>
				</div>

				{#if longDescription}
					<p class="share-dialog__copy">{longDescription}</p>
				{/if}

				<textarea
					bind:this={longField}
					class="share-dialog__field"
					readonly
					spellcheck="false"
					value={longUrl}
				></textarea>

				{#if displayedLongStatus}
					<p class="share-dialog__status">{displayedLongStatus}</p>
				{/if}
			</section>

			<section class="share-dialog__section">
				<div class="share-dialog__section-head">
					<div>
						<p class="share-dialog__eyebrow">Short URL</p>
						<h3>{shortHeading}</h3>
					</div>
				</div>

				{#if shortDescription}
					<p class="share-dialog__copy">{shortDescription}</p>
				{/if}

				{#if shortUrl}
					<textarea
						bind:this={shortField}
						class="share-dialog__field"
						readonly
						spellcheck="false"
						value={shortUrl}
					></textarea>
				{:else}
					<div class="share-dialog__empty">{shortEmptyState}</div>
				{/if}

				{#if displayedShortStatus}
					<p class="share-dialog__status">{displayedShortStatus}</p>
				{/if}

				<div class="share-dialog__actions">
					<button
						type="button"
						class="share-dialog__button share-dialog__button--primary"
						disabled={!shortEligible || shortPending}
						on:click={requestShortUrl}
					>
						{shortPending ? 'Creating...' : shortUrl ? regenerateShortLabel : createShortLabel}
					</button>
					<button
						type="button"
						class="share-dialog__button"
						disabled={!shortUrl}
						on:click={copyShortUrl}
					>
						{copyShortLabel}
					</button>
				</div>
			</section>

			<div class="share-dialog__footer">
				<button type="button" class="share-dialog__button" on:click={closeDialog}>
					{doneLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.share-dialog-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: color-mix(in srgb, black 36%, transparent);
		backdrop-filter: blur(10px);
	}

	.share-dialog {
		width: min(48rem, 100%);
		max-height: min(90vh, 56rem);
		overflow: auto;
		display: grid;
		gap: 1rem;
		padding: 1.2rem;
		border-radius: 1.35rem;
		border: 1px solid
			var(
				--share-dialog-border,
				color-mix(in srgb, var(--theme-highlight, #4a6f88) 18%, transparent)
			);
		background: var(
			--share-dialog-surface,
			color-mix(in srgb, var(--theme-bg-secondary, white) 92%, var(--theme-bg-primary, white))
		);
		box-shadow: 0 18px 36px var(--share-dialog-shadow, color-mix(in srgb, black 16%, transparent));
		color: var(--share-dialog-text, var(--theme-text-primary, #17222b));
	}

	.share-dialog__header,
	.share-dialog__section-head,
	.share-dialog__actions,
	.share-dialog__footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.share-dialog__header,
	.share-dialog__section-head {
		justify-content: space-between;
		align-items: start;
	}

	.share-dialog__footer {
		justify-content: flex-end;
	}

	.share-dialog__section {
		display: grid;
		gap: 0.7rem;
		padding: 1rem;
		border-radius: 1.1rem;
		background: var(
			--share-dialog-section-surface,
			color-mix(in srgb, var(--share-dialog-surface, white) 86%, var(--theme-bg-primary, white))
		);
		border: 1px solid
			var(
				--share-dialog-section-border,
				color-mix(in srgb, var(--theme-highlight, #4a6f88) 12%, transparent)
			);
	}

	.share-dialog__eyebrow {
		margin: 0 0 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(
			--share-dialog-eyebrow,
			color-mix(in srgb, var(--theme-highlight, #4a6f88) 72%, var(--theme-text-secondary, #52606d))
		);
	}

	.share-dialog h2,
	.share-dialog h3 {
		margin: 0;
		font-family: 'Georgia', 'Times New Roman', serif;
	}

	.share-dialog__copy,
	.share-dialog__status {
		margin: 0;
		line-height: 1.5;
		color: var(--share-dialog-copy, var(--theme-text-secondary, #52606d));
	}

	.share-dialog__field,
	.share-dialog__empty,
	.share-dialog__button {
		font: inherit;
	}

	.share-dialog__field,
	.share-dialog__empty {
		border-radius: 1rem;
		border: 1px solid
			var(
				--share-dialog-field-border,
				color-mix(in srgb, var(--theme-highlight, #4a6f88) 18%, transparent)
			);
		background: var(
			--share-dialog-field-surface,
			color-mix(in srgb, var(--theme-bg-primary, white) 88%, white 12%)
		);
	}

	.share-dialog__field {
		min-height: 7.5rem;
		padding: 0.85rem 1rem;
		resize: vertical;
		color: var(--share-dialog-text, var(--theme-text-primary, #17222b));
	}

	.share-dialog__empty {
		padding: 0.9rem 1rem;
		border-style: dashed;
		color: var(--share-dialog-copy, var(--theme-text-secondary, #52606d));
	}

	.share-dialog__button {
		border: 1px solid
			var(
				--share-dialog-button-border,
				color-mix(in srgb, var(--theme-highlight, #4a6f88) 28%, transparent)
			);
		border-radius: 999px;
		padding: 0.72rem 1rem;
		background: var(
			--share-dialog-button-surface,
			color-mix(in srgb, var(--theme-bg-primary, white) 78%, white 22%)
		);
		color: var(--share-dialog-text, var(--theme-text-primary, #17222b));
		cursor: pointer;
		transition:
			transform 120ms ease,
			background-color 120ms ease,
			border-color 120ms ease,
			opacity 120ms ease;
	}

	.share-dialog__button--primary {
		background: var(
			--share-dialog-button-primary-surface,
			color-mix(in srgb, var(--theme-accent, var(--theme-highlight, #4a6f88)) 18%, white 82%)
		);
		border-color: var(
			--share-dialog-button-primary-border,
			color-mix(in srgb, var(--theme-accent, var(--theme-highlight, #4a6f88)) 34%, transparent)
		);
	}

	.share-dialog__button:hover {
		transform: translateY(-1px);
		background: color-mix(
			in srgb,
			var(--share-dialog-button-surface, white) 84%,
			var(--theme-highlight, #4a6f88) 16%
		);
		border-color: color-mix(in srgb, var(--theme-highlight, #4a6f88) 36%, transparent);
	}

	.share-dialog__button:disabled {
		opacity: 0.56;
		cursor: not-allowed;
		transform: none;
	}

	.share-dialog__button:disabled:hover {
		background: var(
			--share-dialog-button-surface,
			color-mix(in srgb, var(--theme-bg-primary, white) 78%, white 22%)
		);
		border-color: var(
			--share-dialog-button-border,
			color-mix(in srgb, var(--theme-highlight, #4a6f88) 28%, transparent)
		);
	}

	.share-dialog__button:focus-visible,
	.share-dialog__field:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--theme-highlight, #4a6f88) 48%, transparent);
		outline-offset: 2px;
	}

	@media (max-width: 760px) {
		.share-dialog__header,
		.share-dialog__section-head,
		.share-dialog__actions,
		.share-dialog__footer {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
