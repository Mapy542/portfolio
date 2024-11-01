import serverReader from './+server';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    let categories = serverReader.getCategories();
    return {props: {categories: categories}};
    
}