import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  plugins: [sveltekit({
    preprocess: vitePreprocess(),
    adapter: adapter(),
    prerender: {
      handleHttpError: 'ignore',
      handleMissingId: 'ignore',
      handleEntryGeneratorMismatch: 'ignore'
    },
    output: {
      preloadStrategy: 'preload-mjs'
    },
    inlineStyleThreshold: 10240
  })],
  assetsInclude: ['$lib/downloads/**/*'],
  build: {
    rollupOptions: {
      external: ['xmldom'],
      maxParallelFileOps: 5,
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
