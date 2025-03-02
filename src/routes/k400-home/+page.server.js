import serverReader from "../../lib/components/serverReader.js";
import categoryMetaData from "$lib/data/categoriesMeta.json" with {type: "json"};

/**@type {import('./$types').PageLoad} */
export async function load() {

  let category="K400-Updates";
    //otherwise, we can proceed assuming the category exists
    let postMetas = {};
try{
     postMetas = serverReader.cachedStripMetaReplacement(Object.values(serverReader.quickIndex[category]) ?? []);
     for(const src of Object.keys(postMetas)){
            postMetas[src]['source']=src.split("/data")[1];
            console.log(postMetas[src]);
        }
} catch(e){
    return {
        status: 500,
        error: e
    }
}

    return {
        props: {
            "postMetas": Object.values(postMetas).reverse(),
        }
    }

}