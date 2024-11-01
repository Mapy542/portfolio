import serverReader from './+server';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    let categories = serverReader.getDocsSRCfromDoc("md1.md")?? "a";
    console.log(categories);
    let data = serverReader.getDocData(categories);
    console.log(data);
    return {props: {categories: [data], docs: []}};
    
}