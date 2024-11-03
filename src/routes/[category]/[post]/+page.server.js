import serverReader from "../../+server";

/**@type {import('./$types').PageLoad} */
export async function load({ params }) {
  const category = params.category;
    const post = params.post + ".md"; // Add .md extension to the post name
    let postData = "";
    try{
        let postSrc = serverReader.getDocsSRCfromQuickIndex(category, post);
        if(!postSrc) {
            postData = "#404 \n Article not found."
        }else{
            postData = serverReader.getDocData(postSrc);
        }
    } catch(e){
        postData = "#500 \n Internal Server Error."
    }

    return {
        props: {
            "markdownContent": postData
        }
    }

}