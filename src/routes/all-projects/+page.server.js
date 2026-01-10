import serverReader from '../../lib/components/DataImport/serverReader.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
  // Get all source files (posts) from all categories
  /** @type {string[]} */
  const allSrcs = serverReader.allSrcs || [];
  
  // Get metadata for all posts
  /** @type {Record<string, any>} */
  let postMetas = {};
  /** @type {string[]} */
  let postSrcs = [];
  
  try {
    postMetas = serverReader.cachedStripMetaReplacement(allSrcs);
    // Build a sortable array of [src, meta] pairs
    const entries = Object.entries(postMetas);
    // Sort by meta.title descending (reverse alphabetical)
    entries.sort((a, b) => {
      const titleA = (a[1]?.title || "").toLowerCase();
      const titleB = (b[1]?.title || "").toLowerCase();
      if (titleA < titleB) return 1; // reverse order
      if (titleA > titleB) return -1;
      return 0;
    });
    // Reconstruct postMetas object in sorted order and aligned postSrcs array
  /** @type {Record<string, any>} */
  const sortedMetas = {};
    for (const [src, meta] of entries) {
      sortedMetas[src] = meta;
      postSrcs.push(src.split("/data")[1]);
    }
    postMetas = sortedMetas;
  } catch(e) {
    return {
      status: 500,
      error: e
    }
  }



  return {
    props: {
      "title": "All Projects",
      "description": "Browse all projects and posts across all categories. Click through to see details, images, and more.",
      "image": "logo.webp",
      // Return metas already sorted
      "postMetas": Object.values(postMetas),
      "postSrcs": postSrcs,
    }
  }
}