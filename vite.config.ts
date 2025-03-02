import { sveltekit } from '@sveltejs/kit/vite';
import { rollupVersion } from 'vite';


export default {
  plugins: [sveltekit()],
  build:{
    rollupOptions: {
      internal: ['xmldom'] //i guess this forces the inclusion of xmldom
    }
  }
}; 
