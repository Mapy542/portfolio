import serverReader from "$lib/components/serverReader";




//Returns Json Array of all Authors Names
export async function GET(){
    let authors = [] //cache the authors in an array
let docMetas = serverReader.metas || {};
for (const src in docMetas) {
    let meta = docMetas[src];
    if (meta && meta.author && !authors.includes(meta.author)) {
        authors.push(meta.author);
    }
}
return new Response(JSON.stringify(authors), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}