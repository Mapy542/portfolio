import serverReader from './+server';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    return {props: {categories: [], docs: []}};
    
}