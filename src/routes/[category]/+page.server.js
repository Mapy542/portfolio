import serverReader from "../../lib/components/serverReader.js";
import categoryMetaData from "$lib/data/categoriesMeta.json" with {type: "json"};

/**@type {import('./$types').PageLoad} */
export async function load({ params }) {
  const category = params.category ?? "";

  if(!categoryMetaData[category]){
    return {
      status: 404,
      error: "Category or page not found."
    }
    } 
    //otherwise, we can proceed assuming the category exists
    let postMetas = {};
    let postSrcs = [];
try{
     postMetas = serverReader.cachedStripMetaReplacement(Object.values(serverReader.quickIndex[category]) ?? []);
     for(const src of Object.keys(postMetas)){
            postSrcs.push(src.split("/data")[1]);
        }
} catch(e){
    return {
        status: 500,
        error: e
    }
}
    return {
        props: {
            "title": categoryMetaData[category].title,
            "description": categoryMetaData[category].description,
            "image": categoryMetaData[category].image,
            "postMetas": Object.values(postMetas),
            "postSrcs": postSrcs,
        }
    }

}