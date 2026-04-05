import { sveltekit } from '@sveltejs/kit/vite';

export default {
  plugins: [sveltekit()],
  assetsInclude: ['$lib/downloads/**/*'],
  build: {
    rollupOptions: {
      external: ['xmldom'],
      maxParallelFileOps: 5,
      output: {
        // Stable (unhashed) filenames for fonts so preload links in app.html stay valid across builds
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n: string) => /\.(otf|woff2?|ttf)$/i.test(n))) {
            return '_app/immutable/assets/fonts/[name][extname]';
          }
          return '_app/immutable/assets/[name]-[hash][extname]';
        }
      }
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
