class DownloadsReader{

    /**
     * @param {string} auxiliaryPath
     */
    constructor(auxiliaryPath) {
        if(auxiliaryPath === ""){
            this.path = "$lib/downloads/";
        }else{
        this.path = auxiliaryPath;
        }
        this.downloads={}; //meta glob import of all downloads, key is src string, value is promise of data
        this.manifests={}; //meta glob import of all manifests, key is src string, value is promise of data
        this.groups = []; //list of groups of downloads
        this.groupedDownloads = {}; //downloads grouped by group, key is group name, value is list of download src strings
    }


    async loadAllData(){
        this.groups = [];
        this.manifests = import.meta.glob( '$lib/downloads/**/manifest.json',{query: '?raw', import: 'default'}) ?? {};

        //import the actual manifest content
        for(const [key, datapromise] of Object.entries(this.manifests)){
            let data = await datapromise();
            data  = JSON.parse(data); //parse the manifest data from json string to object
            let groupDownloads = data; //Take manifest file and use it as the list of downloads in the
            const groupName = key.split("/")[4];
            this.groups.push(groupName);
            const src = key.split("/").slice(0,5).join("/"); //get the src string of the group folder
            for(const [fileName, downloadElement] of Object.entries(groupDownloads.content)){
                const downloadSrc = src + "/" + fileName; //get the src string of the download
                // @ts-ignore
                downloadElement.src = downloadSrc; //add the src string to the download element in the manifest data
                downloadElement.title = fileName; //add the file name as the title of the download element in the manifest data
                // @ts-ignore
            }

            this.groupedDownloads[groupName] = groupDownloads;
            //Add direct this.downloads src strings for each download in the manifest, this is used for the actual download links
        }

    }

    
};

const downloadsReader = new DownloadsReader("");
await downloadsReader.loadAllData();
export default downloadsReader; //shared instance of the reader

console.log("downloads reader loaded");