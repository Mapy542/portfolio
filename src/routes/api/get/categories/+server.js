import serverReader from '#lib/components/DataImport/serverReader.js';

//Returns Json Array of all Categories
export async function GET() {
	return new Response(JSON.stringify(serverReader.getCategories()), {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
