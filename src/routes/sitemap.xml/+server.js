import serverReader from '../../lib/components/serverReader.js';
import staticMetas from '../../lib/data/staticMeta.json' with {type: "json"};
import { DOMImplementation, XMLSerializer } from 'xmldom';

const rootUrl = "https://bukoski.dev";

export const GET=({params})=>{
    const dom = new DOMImplementation();
    let doc = dom.createDocument("","",null);
    const urlset = doc.createElement("urlset");
    urlset.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
    urlset.setAttribute("xmlns:image", "http://www.google.com/schemas/sitemap-image/1.1");
    urlset.setAttribute("xsi:schemaLocation", "http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd");
    urlset.setAttribute("xmlns", "http://www.sitemaps.org/schemas/sitemap/0.9");
    doc.appendChild(urlset);

    let docSrcs = [];
    let categoryAges = {};
    for(const src of serverReader.getDocs()){
        docSrcs.push(serverReader.getDocsSRCfromDoc(src));
    }
    let srcMeta = serverReader.cachedStripMetaReplacement(docSrcs);

    for(const src of Object.keys(srcMeta)){ //for each post
        const url = doc.createElement("url");
        const loc = doc.createElement("loc");
        loc.textContent = rootUrl + src.split("/data"
        )[1].replace(".md",""); //add the url of the page
        url.appendChild(loc);
        
        if(srcMeta[src] && srcMeta[src].date !== undefined){
        const lastmod = doc.createElement("lastmod");
        const date = new Date(srcMeta[src].date);
        lastmod.textContent = date.toISOString();
        url.appendChild(lastmod);

        const category = src.split("data/")[1].split("/")[0];
        if(categoryAges[category]){
            if(categoryAges[category] < date){
                categoryAges[category] = date;
            }
        }else{
            categoryAges[category] = date;
        }
    }

        urlset.appendChild(url);
    }

    for(const category of serverReader.getCategories()){ //for each category
        const url = doc.createElement("url");
        const loc = doc.createElement("loc");
        const leadingTrim = category.startsWith("/") ? "" : "/";
        loc.textContent = rootUrl + leadingTrim + category.replace(" ", "%20"); //add the url of the page
        url.appendChild(loc);
        urlset.appendChild(url);

        if(categoryAges[category]){
            const lastmod = doc.createElement("lastmod");
            lastmod.textContent = categoryAges[category].toISOString();
            url.appendChild(lastmod);
        }

    }

    for(const staticPage of Object.keys(staticMetas)){ //for each static page
        const url = doc.createElement("url");
        const loc = doc.createElement("loc");
        const leadingTrim = staticMetas[staticPage].url.startsWith("/") ? "" : "/";
        loc.textContent = rootUrl + leadingTrim + staticMetas[staticPage].url.replace(" ", "%20"); //add the url of the page
        url.appendChild(loc);
        if(staticMetas[staticPage].date){
            const lastmod = doc.createElement("lastmod");
            const date = new Date(staticMetas[staticPage].date);
            lastmod.textContent = date.toISOString();
            url.appendChild(lastmod);
        }

        urlset.appendChild(url);
    }

    let serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(doc);
    
    return new Response(xmlString, {
        headers: {
            "Content-Type": "application/xml"
        }
    });
};