import serverReader from "../../lib/components/DataImport/serverReader.js";

/**@type {import('./$types').PageLoad} */
export async function load() {


  
    return {
        props: {
            "postMetas": serverReader.metas,
        }
    }

}