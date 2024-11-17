import serverReader from '../lib/components/serverReader';
import staticMetas from '$lib/data/staticMeta.json' with {type: "json"};

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    let categories = serverReader.getCategories();
    return {props: {categories: categories, staticPages: staticMetas}};
    
}