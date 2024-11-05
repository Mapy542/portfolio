import serverReader from '../lib/components/serverReader';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    let categories = serverReader.getCategories();
    return {props: {categories: categories}};
    
}