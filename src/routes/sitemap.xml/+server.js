import serverReader from '../+server.js';
import { stripMeta } from '$lib/components/docMetaStripper.js';
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
    for(const src of serverReader.getDocs()){
        docSrcs.push(serverReader.getDocsSRCfromDoc(src));
    }
    let srcMeta = stripMeta(docSrcs);
    console.log(srcMeta);

    for(const src of Object.keys(srcMeta)){
        const url = doc.createElement("url");
        const loc = doc.createElement("loc");
        loc.textContent = rootUrl + src.split("/data"
        )[1].replace(".md",""); //add the url of the page
        url.appendChild(loc);
        
        if(srcMeta[src].date){
        const lastmod = doc.createElement("lastmod");
        const date = new Date(srcMeta[src].date);
        lastmod.textContent = date.toISOString();
        url.appendChild(lastmod);
        }

        if(srcMeta[src].image){
        const image = doc.createElement("image:image");
        const imageLoc = doc.createElement("image:loc");
        imageLoc.textContent = rootUrl + srcMeta[src].image;
        image.appendChild(imageLoc);
        url.appendChild(image);
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