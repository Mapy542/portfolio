import toolMetas from '../../lib/data/toolsMeta.json' with {type: "json"};

/** @type {import('./$types').PageServerLoad} */
export async function load() {
//get all downloads groups. strip out content obj to save bandwidth.


  return {
    props: {
        toolMetas: toolMetas
    }
  }
}