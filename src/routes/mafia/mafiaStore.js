// Serverside singleton store for Mafia Loan Shark game state management
// Stores loan transactions, resource limits, and interest curve configuration

class MafiaStore {
	/** @type {Object.<string, number>} */
	resourceLimits;

	/** @type {Object.<string, number>} */
	availableResources;

	/** @type {Object} */
	interestCurve;

	/** @type {Array} */
	transactions;

	/** @type {number} */
	nextTransactionId;

	/** @type {string} */
	llmApiUrl;

	/** @type {boolean} */
	marketsClosed;

		/** @type {boolean} */
	phoneBossEnabled;

	constructor() {
		// Available resources with credit limits
		this.resourceLimits = {
			energy_credits: 1000000,
			alloys: 50000,
			minerals: 100000,
			food: 80000,
			goods: 60000,
			motes: 15000,
			gasses: 15000,
			crystals: 15000,
			zro: 5000,
		};

		// Current available amounts
		this.availableResources = {
			energy_credits: 1000000,
			alloys: 50000,
			minerals: 100000,
			food: 80000,
			goods: 60000,
			motes: 15000,
			gasses: 15000,
			crystals: 15000,
			zro: 5000,
		};

		// Exponential curve for interest calculation
		// Interest formula: baseRate - (amplitude * e^(-decay * yearsForRepayment))
		// This creates lower interest for longer repayment periods
		this.interestCurve = {
			default: {
				baseRate: 0.4, // 40% ceiling
				amplitude: 0.3, // Up to 30% swing
				decay: 0.15, // Decay factor (higher = sharper drop)
				minRate: 0.1, // 10% floor
			},
			energy_credits: {
				baseRate: 0.4,
				amplitude: 0.3,
				decay: 0.15,
				minRate: 0.1,
			},
			alloys: {
				baseRate: 0.42,
				amplitude: 0.32,
				decay: 0.15,
				minRate: 0.1,
			},
			minerals: {
				baseRate: 0.38,
				amplitude: 0.28,
				decay: 0.15,
				minRate: 0.1,
			},
			food: {
				baseRate: 0.36,
				amplitude: 0.26,
				decay: 0.15,
				minRate: 0.1,
			},
			goods: {
				baseRate: 0.44,
				amplitude: 0.34,
				decay: 0.15,
				minRate: 0.1,
			},
			motes: {
				baseRate: 0.46,
				amplitude: 0.36,
				decay: 0.15,
				minRate: 0.1,
			},
			gasses: {
				baseRate: 0.46,
				amplitude: 0.36,
				decay: 0.15,
				minRate: 0.1,
			},
			crystals: {
				baseRate: 0.46,
				amplitude: 0.36,
				decay: 0.15,
				minRate: 0.1,
			},
			zro: {
				baseRate: 0.50,
				amplitude: 0.40,
				decay: 0.20,
				minRate: 0.1,
			},
		};

		// Active loans and transactions
		this.transactions = [];
		this.nextTransactionId = 1;

		// LLM API Configuration
		// Default to local Ollama/vLLM at 127.0.0.1:5000
		this.llmApiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:5000';

		// Market status (when closed, loans cannot be submitted)
		this.marketsClosed = false;

				this.phoneBossEnabled = false;
	}

	/**
	 * Calculate interest based on repayment period using exponential curve
	 * @param {number} yearsForRepayment - Repayment period in years (0-30)
	 * @returns {number} Interest rate as decimal (0.1 to 0.4)
	 */
	calculateInterest(yearsForRepayment, resourceType) {
		const curve = this.interestCurve[resourceType] || this.interestCurve.default;
		const { baseRate, amplitude, decay, minRate } = curve;

		if (yearsForRepayment < 0 || yearsForRepayment > 30) {
			throw new Error('Repayment period must be between 0 and 30 years');
		}

		// Exponential decay: lower rates for longer periods
		const rate = baseRate - amplitude * Math.exp(-decay * yearsForRepayment);

		// Ensure within bounds
		return Math.max(minRate, Math.min(baseRate, rate));
	}

	/**
	 * Calculate total repayment amount including interest
	 * @param {number} principal - Loan amount
	 * @param {number} yearsForRepayment - Repayment period in years
	 * @returns {{totalRepayment: number, interest: number, interestRate: string}}
	 */
	calculateRepayment(principal, yearsForRepayment, resourceType) {
		const interestRate = this.calculateInterest(yearsForRepayment, resourceType);
		const interest = principal * interestRate;
		const totalRepayment = principal + interest;

		return {
			totalRepayment: Math.round(totalRepayment),
			interest: Math.round(interest),
			interestRate: (interestRate * 100).toFixed(2),
		};
	}

	/**
	 * Submit a new loan request
	 * @param {Object} loanRequest - { borrower, resourceType, amount, yearsForRepayment }
	 * @param {string} loanRequest.borrower
	 * @param {string} loanRequest.resourceType
	 * @param {number} loanRequest.amount
	 * @param {number} loanRequest.yearsForRepayment
	 * @returns {Object} Transaction record with repayment details
	 */
	submitLoan(loanRequest) {
		const { borrower, resourceType, amount, yearsForRepayment } = loanRequest;

		// Validate
		if (!borrower || !resourceType || !amount || yearsForRepayment === undefined) {
			throw new Error('Missing required loan parameters');
		}

		if (!this.availableResources.hasOwnProperty(resourceType)) {
			throw new Error(`Invalid resource type: ${resourceType}`);
		}

		if (amount > this.availableResources[resourceType]) {
			throw new Error(
				`Insufficient ${resourceType}. Available: ${this.availableResources[resourceType]}`
			);
		}

		// Calculate repayment
		const repaymentDetails = this.calculateRepayment(amount, yearsForRepayment, resourceType);

		// Deduct from available resources
		this.availableResources[resourceType] -= amount;

		// Record transaction
		const transaction = {
			id: this.nextTransactionId++,
			timestamp: new Date().toISOString(),
			borrower,
			resourceType,
			loanAmount: amount,
			yearsForRepayment,
			interestRate: repaymentDetails.interestRate,
			interestAmount: repaymentDetails.interest,
			totalRepayment: repaymentDetails.totalRepayment,
			status: 'active',
		};

		this.transactions.push(transaction);

		return transaction;
	}

	/**
	 * Get all transactions
	 */
	getTransactions() {
		return this.transactions;
	}

	/**
	 * Get available resources
	 */
	getAvailableResources() {
		return { ...this.availableResources };
	}

	/**
	 * Get resource limits
	 */
	getResourceLimits() {
		return { ...this.resourceLimits };
	}

	/**
	 * Get interest curve configuration
	 */
	getInterestCurveConfig() {
		return JSON.parse(JSON.stringify(this.interestCurve));
	}

	/**
	 * Update interest curve (for admin/config)
	 * @param {string} resourceType
	 * @param {Object} updates
	 */
	updateInterestCurve(resourceType, updates) {
		const existing = this.interestCurve[resourceType] || this.interestCurve.default;
		this.interestCurve[resourceType] = { ...existing, ...updates };
	}

	/**
	 * Update resource availability and/or limits
	 * @param {string} resourceType
	 * @param {{ available?: number; limit?: number }} updates
	 */
	setResourceState(resourceType, updates) {
		if (!this.availableResources.hasOwnProperty(resourceType)) {
			throw new Error(`Invalid resource type: ${resourceType}`);
		}

		const nextLimits = { ...this.resourceLimits };
		const nextAvailable = { ...this.availableResources };

		if (typeof updates.limit === 'number' && !Number.isNaN(updates.limit)) {
			nextLimits[resourceType] = Math.max(0, updates.limit);
		}

		if (typeof updates.available === 'number' && !Number.isNaN(updates.available)) {
			nextAvailable[resourceType] = Math.max(0, updates.available);
		}

		// Clamp available to limit after updates
		const finalLimit = nextLimits[resourceType];
		if (typeof finalLimit === 'number') {
			nextAvailable[resourceType] = Math.min(nextAvailable[resourceType], finalLimit);
		}

		this.resourceLimits = nextLimits;
		this.availableResources = nextAvailable;
	}

	/**
	 * Replenish resources (simulating incoming payments)
	 * @param {string} resourceType
	 * @param {number} amount
	 */
	replenishResource(resourceType, amount) {
		if (!this.availableResources.hasOwnProperty(resourceType)) {
			throw new Error(`Invalid resource type: ${resourceType}`);
		}
		this.availableResources[resourceType] += amount;
		this.availableResources[resourceType] = Math.min(
			this.availableResources[resourceType],
			this.resourceLimits[resourceType]
		);
	}

	/**
	 * Get LLM API URL
	 * @returns {string}
	 */
	getLlmApiUrl() {
		return this.llmApiUrl;
	}

	/**
	 * Update LLM API URL (in case it changes)
	 * @param {string} newUrl
	 */
	setLlmApiUrl(newUrl) {
		this.llmApiUrl = newUrl;
	}

	/**
	 * Get markets closed status
	 * @returns {boolean}
	 */
	isMarketsClosed() {
		return this.marketsClosed;
	}

	/**
	 * Set markets closed status
	 * @param {boolean} closed
	 */
	setMarketsClosed(closed) {
		this.marketsClosed = !!closed;
	}
		getPhoneBossEnabled() {
	  return this.phoneBossEnabled;
	}
	setPhoneBossEnabled(val) {
	  this.phoneBossEnabled = !!val;
	}
}

// Export singleton instance
export const mafiaStore = new MafiaStore();