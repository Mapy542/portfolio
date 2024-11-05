import serverReader from '../lib/components/serverReader';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    return {props: {categories: [], docs: []}};
    
}