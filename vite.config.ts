import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      external: ['xmldom'],
      // Reduce concurrent file operations
      maxParallelFileOps: 5
    },
    // Reduce chunk size to prevent too many simultaneous operations
    chunkSizeWarningLimit: 1000,
    // Optimize asset handling
    assetsInlineLimit: 4096
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
