import serverReader from "../../routes/+server";

export function stripMeta(docSRCArray){
    let stripped = {};
    for(const src of docSRCArray){
        let data = serverReader.getDocData(src);
        if(data){
            let title = "";
            let date = "";
            let tags = [];
            let author = "";
            let image = "";
            let description = "";
            for(const line of data.split("\n")){
                if(line.startsWith("#! title: ")){
                    title = line.replace("#! title: ", "").replace(/[\r\n]+/gm, "");
                } else if(line.startsWith("#! date: ")){
                    date = line.replace("#! date: ", "").replace(/[\r\n]+/gm, "");
                } else if(line.startsWith("#! tags: ")){
                    tags = line.replace("#! tags: ", "").replace(/[\r\n]+/gm, "").split(", ");
                } else if(line.startsWith("#! author: ")){
                    author = line.replace("#! author: ", "").replace(/[\r\n]+/gm, "");
                }else if(line.startsWith("#! image: ")){
                    image = line.replace("#! image: ", "").replace(/[\r\n]+/gm, "");
                }else if(line.startsWith("#! description: ")){
                    description = line.replace("#! description: ", "").replace(/[\r\n]+/gm, "");
                }
            }
            if(title){
                stripped[src] = {
                    title: title,
                    date: date,
                    tags: tags,
                    image: image,
                    author: author,
                    description: description
            }
        }
    }
    }
    return stripped;
}