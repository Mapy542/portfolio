import serverReader from "../../../lib/components/serverReader.js";

export async function GET({url}){
const positiveMatch = url.searchParams.get("positive")||null;
const negativeMatch = url.searchParams.get("negative")||null;
const category = url.searchParams.get("category") || null;
const author = url.searchParams.get("author") || null;
const date = url.searchParams.get("date") || null;
const tags = url.searchParams.get("tags") || null;

let results = [];
if (positiveMatch){
    //we have csv words to regex match in posts
    const words = positiveMatch.split(",").map(word => word.trim());
    const wholeWordsReg = words.map(word=> `\\b${word}\\b`);
    let allDocSrcs = serverReader.allSrcs || [];
    let reg = new RegExp(wholeWordsReg.join("|"), "i");

    for (const src of allDocSrcs) {
        let docData = serverReader.getDocData(src);
        if (docData && reg.test(docData)) {
            results.push(src);
        }
    }
}else{
    results = serverReader.allSrcs || [];
}

//now filter for negatives
let filteredResults = []
for (const src of results) {
    let docData = serverReader.getDocData(src);
    let docMeta = serverReader.cachedStripMetaReplacement([src])[src] || {};
    if (negativeMatch) {
        const negativeWords = negativeMatch.split(",").map(word => word.trim());
        let negReg = new RegExp(negativeWords.join("|"), "i");
        if (negReg.test(docData)) {
            //if negative match is found, skip this src
            continue;
        }
    }

    //filter by category
    if (category && !serverReader.getDocsSRCInCategory(category).includes(src)) {
        continue; //skip this src if it is not in the category
    }

    //filter by author
    if (author && ! (docMeta.author.toLowerCase() === author.toLowerCase())) {
        continue; //skip this src if the author does not match
    }

    //filter by date
    if (date && !(Date.parse(docMeta.date) === Date.parse(date))) {
        continue; //skip this src if the date does not match
    }

    //filter by tags
    if (tags){
        const tagList = tags.split(",").map(tag => tag.trim());
        let hasAllTags = true;
        for (const tag of tagList) {
            if (!docMeta.tags || !docMeta.tags.includes(tag)) {
                hasAllTags = false;
                break; //skip this src if it does not have all tags
            }
        }
        if (!hasAllTags) {
            continue; //skip this src if it does not have all tags
        }
    }
    //if we reach here, the src matches all filters
    filteredResults.push(src);
    }


return new Response(JSON.stringify({
"results": filteredResults,}))


}