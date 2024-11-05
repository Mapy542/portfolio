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
            if(key.includes("categoriesMeta.json")){
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
                    for(const [key, datapromise] of Object.entries(this.import)){
                        //@ts-ignore
                        this.data[key] = await datapromise();
                        
                    }
    }

    getCategories(){
        return this.categories;
    }

    getDocs(){
        return this.docs;
    }

    /**
     * @param {string} category
     * @returns {string[]}
     * 
     * */
    getDocsSRCInCategory(category){
        // @ts-ignore
        return this.quickIndex[category] ?? [];
    }

    /**
     * @param {string} doc
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
     */
    getDocsSRCfromQuickIndex(category, doc){
        // @ts-ignore
        return this.quickIndex[category][doc] ?? null;
    }

    /**
     * 
     * @param {string} src 
     * @returns 
     */
   getDocData(src){
        // @ts-ignore
       return this.data[src];
   }

};

const serverReader = new StoreReader("");
await serverReader.loadAllData();

export default serverReader; //shared instance of the reader