import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';

export default {
	plugins: [
		sveltekit({
			// Consult https://kit.svelte.dev/docs/integrations#preprocessors
			// for more information about preprocessors
			preprocess: vitePreprocess(),

			// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://kit.svelte.dev/docs/adapters for more information about adapters.
			adapter: adapter(),

			prerender: {
				handleHttpError: 'ignore',
				handleMissingId: 'ignore',
				handleEntryGeneratorMismatch: 'ignore'
			},
			output: {},
			inlineStyleThreshold: 10240
		})
	],
	assetsInclude: ['#lib/downloads/**/*'],
	build: {
		rollupOptions: {
			external: ['xmldom'],
			maxParallelFileOps: 5
		},
		// Reduce chunk size to prevent too many simultaneous operations
		chunkSizeWarningLimit: 1000,
		// Optimize asset handling
		assetsInlineLimit: 10240
	},
	// Increase file watcher limits
	server: {
		watch: {
			usePolling: false,
			useFsEvents: false
		}
	},
	// Reduce concurrent processing
	optimizeDeps: {
		force: true
	}
};
