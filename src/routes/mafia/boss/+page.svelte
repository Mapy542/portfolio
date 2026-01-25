<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	export let data;
	export let form;

	const authed = data.authenticated || form?.authenticated || false;

	let state = authed
		? {
				resources: structuredClone(data.resources),
				resourceLimits: structuredClone(data.resourceLimits),
				interestCurve: structuredClone(data.interestCurve),
				transactions: data.transactions ?? [],
				llmApiUrl: data.llmApiUrl,
				marketsClosed: data.marketsClosed ?? false
			}
		: {
				resources: {},
				resourceLimits: {},
				interestCurve: {},
				transactions: [],
				llmApiUrl: '',
				marketsClosed: false
			};

	let lastSeenIds = new Set(state.transactions.map((t) => t.id));
	let notificationsReady = false;
	let pendingAlerts = [];

	onMount(() => {
		if (!authed) return;
		if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
			notificationsReady = true;
		}

		const interval = setInterval(async () => {
			await refreshState();
		}, 15000);

		return () => clearInterval(interval);
	});

	async function refreshState() {
		if (!authed) return;
		try {
			const res = await fetch('/mafia/api');
			if (!res.ok) return;
			const payload = await res.json();

			const newTransactions = payload.transactions ?? [];
			const newOnes = newTransactions.filter((t) => !lastSeenIds.has(t.id));
			if (newOnes.length) {
				newOnes.forEach(showTradeNotification);
				lastSeenIds = new Set(newTransactions.map((t) => t.id));
			}

			state = {
				resources: payload.resources ?? state.resources,
				resourceLimits: payload.resourceLimits ?? state.resourceLimits,
				interestCurve: payload.interestCurve ?? state.interestCurve,
				transactions: newTransactions,
				llmApiUrl: payload.llmApiUrl ?? state.llmApiUrl,
				marketsClosed: payload.marketsClosed ?? state.marketsClosed
			};
		} catch (err) {
			// ignore
		}
	}

	async function enableNotifications() {
		if (typeof Notification === 'undefined') return;
		const permission = await Notification.requestPermission();
		notificationsReady = permission === 'granted';
	}

	function showTradeNotification(trade) {
		const message = `${trade.borrower} borrowed ${trade.loanAmount} ${trade.resourceType.replace(/_/g, ' ')} for ${trade.yearsForRepayment}y`;
		pendingAlerts = [message, ...pendingAlerts].slice(0, 5);

		if (typeof Notification === 'undefined') return;
		if (!notificationsReady) return;
		new Notification('New trade received', { body: message });
	}
</script>

<div class="admin-page">
	<header>
		<h1>Mafia Boss Control Room</h1>
		<p>
			Inspect and edit the family ledger. Live refresh every 15s; notifications fire on new trades.
		</p>
	</header>

	{#if form?.message}
		<div class="banner success">{form.message}</div>
	{:else if form?.error}
		<div class="banner error">{form.error}</div>
	{/if}

	{#if !authed}
		<section class="login">
			<h2>Boss Login</h2>
			<p>Whaddaya know—family only beyond this point.</p>
			<form method="POST" action="?/login" use:enhance>
				<label>
					Password
					<input name="password" type="password" placeholder="Enter password" required />
				</label>
				<button class="btn" type="submit">Enter the family</button>
			</form>
		</section>
	{:else}
		<section class="notifications">
			<h2>Notifications</h2>
			<p>Browser alerts will pop when new trades arrive.</p>
			<button class="btn" on:click={enableNotifications} disabled={notificationsReady}>
				{notificationsReady ? 'Notifications enabled' : 'Enable notifications'}
			</button>
			{#if pendingAlerts.length}
				<ul class="alerts">
					{#each pendingAlerts as alert}
						<li>{alert}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="market">
			<h2>Market Controls</h2>
			<form method="POST" action="?/setMarketStatus" use:enhance>
				<input type="hidden" name="closed" value={state.marketsClosed ? 'false' : 'true'} />
				<button class="btn" type="submit">
					{state.marketsClosed ? 'Open the market' : 'Close the market'}
				</button>
				<p class="note">
					{state.marketsClosed
						? "Market's closed—no deals today."
						: 'Market open—bring the trades.'}
				</p>
			</form>
		</section>

		<section class="llm">
			<h2>LLM Endpoint</h2>
			<form method="POST" action="?/updateLlm" use:enhance>
				<label for="llmApiUrl">LLM API URL</label>
				<input id="llmApiUrl" name="llmApiUrl" type="text" bind:value={state.llmApiUrl} required />
				<button class="btn" type="submit">Save LLM URL</button>
			</form>
		</section>

		<section class="resources">
			<h2>Resources</h2>
			<div class="grid">
				{#each Object.entries(state.resources) as [resource, amount]}
					<form method="POST" action="?/updateResource" use:enhance class="card">
						<div class="row">
							<span class="label">Resource</span>
							<strong>{resource.replace(/_/g, ' ')}</strong>
						</div>
						<input type="hidden" name="resourceType" value={resource} />
						<label>
							Available for loans
							<input
								name="available"
								type="number"
								min="0"
								bind:value={state.resources[resource]}
							/>
						</label>
						<button class="btn" type="submit">Save</button>
					</form>
				{/each}
			</div>
		</section>

		<section class="interest">
			<h2>Interest Curves</h2>
			<div class="grid">
				{#each Object.entries(state.interestCurve) as [curveKey, curve]}
					<form method="POST" action="?/updateInterest" use:enhance class="card">
						<input type="hidden" name="resourceType" value={curveKey} />
						<div class="row">
							<span class="label">Target</span>
							<strong>{curveKey.replace(/_/g, ' ')}</strong>
						</div>
						<label>
							Base rate
							<input name="baseRate" type="number" step="0.01" bind:value={curve.baseRate} />
						</label>
						<label>
							Amplitude
							<input name="amplitude" type="number" step="0.01" bind:value={curve.amplitude} />
						</label>
						<label>
							Decay
							<input name="decay" type="number" step="0.01" bind:value={curve.decay} />
						</label>
						<label>
							Min rate
							<input name="minRate" type="number" step="0.01" bind:value={curve.minRate} />
						</label>
						<button class="btn" type="submit">Save</button>
					</form>
				{/each}
			</div>
		</section>

		<section class="transactions">
			<h2>Recent Trades</h2>
			{#if state.transactions?.length}
				<ul>
					{#each state.transactions.slice().reverse().slice(0, 20) as txn}
						<li>
							<strong>#{txn.id}</strong> · {txn.borrower} took {txn.loanAmount}
							{txn.resourceType.replace(/_/g, ' ')} over {txn.yearsForRepayment}y · total {txn.totalRepayment}
							· rate {txn.interestRate}%
						</li>
					{/each}
				</ul>
			{:else}
				<p>No trades yet.</p>
			{/if}
		</section>
		<section class="logout">
			<form method="POST" action="?/logout" use:enhance>
				<button class="btn" type="submit">Leave the room</button>
			</form>
		</section>
	{/if}
</div>

<style>
	.admin-page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px;
		color: #f5f5f5;
		font-family: 'Segoe UI', sans-serif;
		background: #0f1424;
	}

	header h1 {
		margin: 0 0 6px 0;
	}

	header p {
		margin: 0 0 16px 0;
		color: #d0d0d0;
	}

	section {
		margin: 20px 0;
		padding: 16px;
		border: 1px solid #28324a;
		background: #11182b;
		border-radius: 8px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
	}

	h2 {
		margin-top: 0;
		margin-bottom: 10px;
	}

	.banner {
		padding: 12px 16px;
		border-radius: 6px;
		margin-bottom: 12px;
	}

	.banner.success {
		background: rgba(76, 175, 80, 0.1);
		border: 1px solid rgba(76, 175, 80, 0.4);
	}

	.banner.error {
		background: rgba(255, 107, 107, 0.1);
		border: 1px solid rgba(255, 107, 107, 0.4);
	}

	.login {
		padding: 24px;
		border: 1px solid #28324a;
		background: #11182b;
		border-radius: 8px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.9rem;
		color: #d0d0d0;
	}

	input,
	button,
	select {
		font: inherit;
	}

	input,
	select {
		padding: 8px 10px;
		border: 1px solid #28324a;
		border-radius: 6px;
		background: #0c1120;
		color: #f5f5f5;
	}

	.btn {
		margin-top: 10px;
		padding: 10px 14px;
		border: 1px solid #3d6df2;
		background: #3d6df2;
		color: #fff;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn:not(:disabled):hover {
		background: #335cd2;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		border: 1px solid #28324a;
		border-radius: 8px;
		background: #0d1323;
	}

	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #cdd3e3;
	}

	.row .label {
		color: #9aa3ba;
		font-size: 0.9rem;
	}

	.transactions ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.transactions li {
		padding: 10px 12px;
		background: #0d1323;
		border-radius: 6px;
		border: 1px solid #28324a;
		color: #d6d9e3;
		font-size: 0.95rem;
	}
</style>
