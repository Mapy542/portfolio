import serverReader from '../../lib/components/serverReader.js';

/**@type {import('./$types').PageLoad} */
export async function load() {
  // Get all source files (posts) from all categories
  const allSrcs = serverReader.allSrcs || [];
  
  // Get metadata for all posts
  let postMetas = {};
  let postSrcs = [];
  
  try {
    postMetas = serverReader.cachedStripMetaReplacement(allSrcs);
    for(const src of Object.keys(postMetas)){
      postSrcs.push(src.split("/data")[1]);
    }
  } catch(e) {
    return {
      status: 500,
      error: e
    }
  }

  return {
    props: {
      "title": "All Projects",
      "description": "Browse all projects and posts across all categories.",
      "image": "logo.webp",
      "postMetas": Object.values(postMetas),
      "postSrcs": postSrcs,
    }
  }
}