import { stripMeta } from "./docMetaStripper";

class StoreReader{

    /**
     * @param {string} auxiliaryPath
     */
    constructor(auxiliaryPath) {
        if(auxiliaryPath === ""){
            this.path = "$lib/data/";
        }else{
        this.path = auxiliaryPath;
        this.data={};
        this.import={};
        this.categories=[]; //list of categories
        this.docs=[]; //list of all docs
        this.metas = {}; //list of all stripped metadata
        this.allSrcs = []; //list of all src strings
        this.quickIndex = {}; //double array of docs inside categories
        }
    }


    async loadAllData(){
        console.log("Loading all data");
        this.categories = [];
        this.docs = [];
        this.quickIndex = {};
        this.data = {};
        this.import = import.meta.glob( '$lib/data/**/*',{query: '?raw', import: 'default'}) ?? {};
        for(const key in this.import){
            if(key.includes(".json")){
                continue; //skip the categories meta file
            }
            let category = key.split("/")[4];
            let doc = key.split("/")[5];

            let push = true;
            for (let i = 0; i < this.categories.length; i++){
                if(this.categories[i] === category){
                    push = false;
                }
            }
            if(push){
                this.categories.push(category);
                // @ts-ignore
                this.quickIndex[category] = {};
            }

            this.docs.push(doc);
            // @ts-ignore
            this.quickIndex[category][doc]  = key;
        }


        //import the actual data
        this.allSrcs = [];
        for(const [key, datapromise] of Object.entries(this.import)){
            if(key.includes(".json")){
                continue; //skip the categories meta file
            }
            //@ts-ignore
            this.data[key] = await datapromise();
            this.allSrcs.push(key); //used for caching metadata, we need all src strings
        }
    }

    /**
     * @brief caches the stripped metadata of all docs
     * */
    cacheMetaData(){
        //apply stripped metadata
        this.metas = stripMeta(this.allSrcs);
    }

    /**
     * 
      * @brief returns a list of all category names
    * @returns {string[]}
    */
    getCategories(){
        return this.categories;
    }

    /**
     * @brief returns a list of all doc names
     * @returns 
     */
    getDocs(){
        return this.docs;
    }

    /**
     * @param {string} category
     * @returns {string[]}
     * @breif returns a list of all docs src strings in a category
     * */
    getDocsSRCInCategory(category){
        // @ts-ignore
        return this.quickIndex[category] ?? [];
    }

    /**
     * @param {string} doc
     * @returns {string}
     * @brief returns the src string of a doc from its name
     */
    getDocsSRCfromDoc(doc){
        for(const key in this.data){
            if(key.split("/")[5] === doc){
                return key;
            }
        }
    }

    /**
     * 
     * @param {string} category 
     * @param {string} doc 
     * @returns {string}
     * @brief returns the src string of a doc from its name and category (more efficient than getDocsSRCfromDoc)
     */
    getDocsSRCfromQuickIndex(category, doc){
        // @ts-ignore
        return this.quickIndex[category][doc] ?? null;
    }

    /**
     * 
     * @param {string} src 
     * @returns  {string}
     * @brief returns the actual data of a doc from its src string
     */
   getDocData(src){
        // @ts-ignore
       return this.data[src];
   }

    /**
     * 
     * @param {string} src 
     * @returns {string}
     * @brief returns the stripped metadata of a doc from its src string
     */
   getDocMetaData(src){
       return this.metas[src];
   }

   /**
    * @brief returns the stripped metadata of all docs given by their src strings, intended for strip meta replacement.
    * @param {string[]} srcArray
    * @returns {Object}
    */
   cachedStripMetaReplacement(srcArray){
        let stripped = {};
        for(const src of srcArray){
            if (this.metas[src] === undefined || this.metas[src] === null){
                console.log("Error: src not found in metas: " + src);
                continue;
            } //mimic skipping for no data behavior
            stripped[src] = this.metas[src];
        }
        return stripped;
   }

};

const serverReader = new StoreReader("");
await serverReader.loadAllData();
export default serverReader; //shared instance of the reader

serverReader.cacheMetaData(); //strip and cache metadata from all docs
console.log("Server reader loaded");