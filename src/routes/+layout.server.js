import serverReader from '../lib/components/serverReader';
import staticMetas from '$lib/data/staticMeta.json' with {type: "json"};

import { dev } from '$app/environment';


export const csr = true; //header is client side rendered always
export const prerender = dev? false:"auto"; //we want to prerender this page if possible
export const ssr = true; //we want to server side render where possible i think

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    let categories = serverReader.getCategories();
    return {props: {categories: categories, staticPages: staticMetas}};
    
}