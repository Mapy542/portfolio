import { mafiaStore } from '../mafiaStore.js';

export const csr = true; //header is client side rendered always
export const prerender = false; //we want to prerender this page if possible
export const ssr = false; //we want to server side render where possible i think

export async function load({ cookies }) {
	const isAuthed = cookies.get('mafia_boss_auth') === 'ok';
	if (!isAuthed) {
		return { authenticated: false };
	}
	return {
		authenticated: true,
		resources: mafiaStore.getAvailableResources(),
		resourceLimits: mafiaStore.getResourceLimits(),
		interestCurve: mafiaStore.getInterestCurveConfig(),
		transactions: mafiaStore.getTransactions(),
		llmApiUrl: mafiaStore.getLlmApiUrl(),
		marketsClosed: mafiaStore.isMarketsClosed(),
	};
}

function parseNumber(value) {
	if (value === null || value === undefined || value === '') return undefined;
	const n = Number(value);
	return Number.isNaN(n) ? undefined : n;
}

export const actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const password = formData.get('password')?.toString() ?? '';
		const ADMIN_PASSWORD = process.env.BOSS_PASSWORD || 'bugs';

		if (password === ADMIN_PASSWORD) {
			cookies.set('mafia_boss_auth', 'ok', {
				path: '/mafia/boss',
				maxAge: 7 * 24 * 60 * 60,
				sameSite: 'lax',
			});
			return { success: true, authenticated: true, message: 'Welcome, boss.' };
		}

		return { success: false, authenticated: false, error: 'Wrong password.' };
	},

	logout: async ({ cookies }) => {
		cookies.delete('mafia_boss_auth', { path: '/mafia/boss' });
		return { success: true, authenticated: false, message: 'See you, boss.' };
	},
	updateResource: async ({ request }) => {
		const formData = await request.formData();
		const resourceType = formData.get('resourceType')?.toString() ?? '';
		const available = parseNumber(formData.get('available'));
		const limit = parseNumber(formData.get('limit'));

		try {
			if (!resourceType) throw new Error('Resource type is required');
			if (available === undefined && limit === undefined) {
				throw new Error('Provide at least one of available or limit');
			}

			mafiaStore.setResourceState(resourceType, { available, limit });

			return {
				success: true,
				message: `Updated ${resourceType.replace(/_/g, ' ')} successfully`,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},

	updateInterest: async ({ request }) => {
		const formData = await request.formData();
		const resourceType = formData.get('resourceType')?.toString() ?? 'default';
		const baseRate = parseNumber(formData.get('baseRate'));
		const amplitude = parseNumber(formData.get('amplitude'));
		const decay = parseNumber(formData.get('decay'));
		const minRate = parseNumber(formData.get('minRate'));

		try {
			mafiaStore.updateInterestCurve(resourceType, {
				...(baseRate !== undefined ? { baseRate } : {}),
				...(amplitude !== undefined ? { amplitude } : {}),
				...(decay !== undefined ? { decay } : {}),
				...(minRate !== undefined ? { minRate } : {}),
			});

			return {
				success: true,
				message: `Interest curve updated for ${resourceType.replace(/_/g, ' ')}`,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},

	updateLlm: async ({ request }) => {
		const formData = await request.formData();
		const llmApiUrl = formData.get('llmApiUrl')?.toString().trim();

		try {
			if (!llmApiUrl) throw new Error('LLM API URL is required');
			mafiaStore.setLlmApiUrl(llmApiUrl);
			return {
				success: true,
				message: 'LLM API URL updated',
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},

	setMarketStatus: async ({ request }) => {
		const formData = await request.formData();
		const closed = (formData.get('closed')?.toString() ?? 'false') === 'true';
		mafiaStore.setMarketsClosed(closed);
		return {
			success: true,
			message: closed ? "Market's closed. No deals today." : 'Market open. Bring the trades.',
		};
	},
};
