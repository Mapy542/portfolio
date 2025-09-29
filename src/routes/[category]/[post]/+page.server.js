import serverReader from "../../../lib/components/serverReader";

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
            postData = "# 404 \n## Article not found. \n[Return to home page.](/)";
        }else{
            postData = serverReader.getDocData(postSrc);
            postMeta = serverReader.cachedStripMetaReplacement([serverReader.getDocsSRCfromQuickIndex(category, post)]);
        }
    } catch(e){
        postData = "# 500 \n## Internal Server Error. \n[Return to home page.](/)";
    }

    

    return {
        props: {
            "markdownContent": postData,
            "postMeta": postMeta[postSrc]

        }
    }

}