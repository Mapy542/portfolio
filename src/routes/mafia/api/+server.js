import { json } from '@sveltejs/kit';
import { mafiaStore } from '../mafiaStore.js';

export async function GET() {
	return json({
		resources: mafiaStore.getAvailableResources(),
		resourceLimits: mafiaStore.getResourceLimits(),
		interestCurve: mafiaStore.getInterestCurveConfig(),
		transactions: mafiaStore.getTransactions(),
		marketsClosed: mafiaStore.isMarketsClosed(),
	});
}
