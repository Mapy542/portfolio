import downloadReader from '../../../lib/components/DataImport/downloadsReader';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params}) {
    const group = params.group ?? "";
    const groupData = downloadReader.groupedDownloads[group];
    if(!groupData){
        return {
            status: 404,
            error: "Download group not found."
        }
    }
  return {
    props: {
        groupedDownloads: groupData,
    }
  }
}