import downloadReader from '../../lib/components/DataImport/downloadsReader';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
//get all downloads groups. strip out content obj to save bandwidth.
const groupedDownloads = downloadReader.groupedDownloads;
let strippedGroupedDownloads = {};
for(const [groupName, groupData] of Object.entries(groupedDownloads)){
    strippedGroupedDownloads[groupName] = {
        title: groupData.title,
        description: groupData.desc,
        thumbnail: groupData.heroImg,
        src: "/downloads/" + groupName,
        isLink: true
    };
    //iterate through content and find latest dataModified date for the group
    let latestDateModified = null;
    for(const [downloadName, downloadData] of Object.entries(groupData.content)){
        if(downloadData.dateModified){
            const dateModified = new Date(downloadData.dateModified);
            if(!latestDateModified || dateModified > latestDateModified){
                latestDateModified = dateModified;
            }
        }else if(downloadData.dateAdded){
            const dateAdded = new Date(downloadData.dateAdded);
            if(!latestDateModified || dateAdded > latestDateModified){
                latestDateModified = dateAdded;
            }
        }
    }
    strippedGroupedDownloads[groupName].dateModified = latestDateModified ? latestDateModified.toLocaleDateString() : null;
  }

  return {
    props: {
        groupedDownloads: strippedGroupedDownloads
    }
  }
}