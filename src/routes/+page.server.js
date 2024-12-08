import serverReader from '../lib/components/serverReader';

/**@type {import('./$types').PageServerLoad} */
export async function load() {
    const docNames = serverReader.getDocs()??[];
    const doc = docNames[Math.round(Math.random() * docNames.length)] ?? docNames[0];
    const doc2 = docNames[Math.round(Math.random() * docNames.length)] ?? docNames[1];

    const metas = serverReader.cachedStripMetaReplacement([serverReader.getDocsSRCfromDoc(doc), serverReader.getDocsSRCfromDoc(doc2)]);

    let docProps = [];
    for(let meta of Object.keys(metas)) {
        docProps.push({
            "title": metas[meta].title,
            "description": metas[meta].description,
            "link": meta.split("/data")[1].replace(".md", ""),
            "image": metas[meta].image
        });
    }

    return {props: {
       "docProps": docProps
    }};
    
}