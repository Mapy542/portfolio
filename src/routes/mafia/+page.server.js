import { mafiaStore } from './mafiaStore.js';

export const csr = true; //header is client side rendered always
export const prerender = false; //we want to prerender this page if possible
export const ssr = false; //we want to server side render where possible i think

export async function load() {
	return {
		resources: mafiaStore.getAvailableResources(),
		transactions: mafiaStore.getTransactions(),
		interestCurve: mafiaStore.getInterestCurveConfig(),
		marketsClosed: mafiaStore.isMarketsClosed(),	
			phoneBossEnabled: mafiaStore.getPhoneBossEnabled(),
	};
}

export const actions = {
	submitLoan: async ({ request }) => {
		const formData = await request.formData();

		const borrower = formData.get('borrower') ?? '';
		const resourceType = formData.get('resourceType') ?? '';
		const amountStr = formData.get('amount');
		const yearsStr = formData.get('yearsForRepayment');

		const amount = amountStr ? parseInt(amountStr.toString()) : 0;
		const yearsForRepayment = yearsStr ? parseFloat(yearsStr.toString()) : 0;

		try {
				// Server-side enforcement: reject trades when market is closed
				if (mafiaStore.isMarketsClosed()) {
					return {
						success: false,
						error: "Market's closed—no deals today."
					};
				}

			const transaction = mafiaStore.submitLoan({
				borrower,
				resourceType,
				amount,
				yearsForRepayment,
			});

			const displayResource = resourceType.replace(/_/g, ' ');
			const monthly = Math.ceil(transaction.totalRepayment / (transaction.yearsForRepayment * 12));

			return {
				success: true,
				transaction,
				message: `Loan approved, don! Monthly tribute set at ${monthly} ${displayResource}. Tick tock! 🐛`,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return {
				success: false,
				error: errorMessage,
			};
		}
	},

	askBoss: async ({ request }) => {
		const formData = await request.formData();
		const question = formData.get('question') ?? '';

		try {
			// Get LLM API URL from store (can be changed dynamically)
			const apiUrl = mafiaStore.getLlmApiUrl();

			// Chat-completions body per updated prompt.txt
			const body = {
				messages: [
					{
						role: 'system',
						content:
							'You are a goofy, eccentric mafia boss character. You speak in a mix of Italian phrases, broken English, and mafia slang. You reference bugs, birds, and the mafia life constantly. You are obsessed with profits and little schemes. Keep responses short (2-3 sentences max) and funny.',
					},
					{
						role: 'user',
						content: question,
					},
				],
				mode: 'chat-instruct',
				character: 'Mafia Boss',
				temperature: 1.2,
				top_p: 0.95,
				top_k: 20,
			};

			const response = await fetch(`${apiUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				throw new Error(`LLM API error: ${response.statusText}`);
			}

			const data = await response.json();
			const raw = data.choices?.[0]?.message?.content?.trim() || 'Ciao! No words for you today.';
			// Strip any <think>...</think> blocks
			const advice = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

			return {
				success: true,
				advice,
			};
		} catch (error) {
			// Fallback responses if API is unavailable
			const fallbackResponses = [
				"Listen here, don. You ask too many questions. Focus on the credits, capisce?",
				"The little bugs don't ask questions—they just work. You should be more like them.",
				"Advice? Here's advice: Find more birds to squeeze. That's how you survive, boss.",
				"You're wasting my time with this nonsense. Go make some money and come back when you got something smart to say.",
				"Aah, I like your style asking the boss. But I don't give free advice. That'll be 10% of your next loan. Ciao!",
			];

			const randomAdvice = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

			return {
				success: true,
				advice: randomAdvice,
				fallback: true,
			};
		}
	},
};
