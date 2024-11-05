import serverReader from "../../+server";
import { stripMeta } from "$lib/components/docMetaStripper";

/**@type {import('./$types').PageLoad} */
export async function load({ params }) {
  const category = params.category;
    const post = params.post + ".md"; // Add .md extension to the post name
    let postData = "";
    let postSrc = "";
    let postMeta = {};
    try{
        postSrc = serverReader.getDocsSRCfromQuickIndex(category, post);
        if(!postSrc) {
            postData = "#404 \n Article not found."
        }else{
            postData = serverReader.getDocData(postSrc);
            postMeta = stripMeta([serverReader.getDocsSRCfromQuickIndex(category, post)]);
        }
    } catch(e){
        postData = "#500 \n Internal Server Error."
    }

    

    return {
        props: {
            "markdownContent": postData,
            "postMeta": postMeta[postSrc]

        }
    }

}