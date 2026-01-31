<script>
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	/** @type {{resources: Object.<string, number>, transactions: any[], interestCurve: Record<string, { baseRate: number; amplitude: number; decay: number; minRate: number }>}} */
	export let data;
	export let form;

	let borrowerName = '';
	let selectedResource = 'energy_credits';
	let loanAmount = '';
	let repaymentYears = 2;

	let bossQuestion = '';
	/** @type {string | null} */
	let bossAdvice = null;
	let adviseFetching = false;

	let loanSubmitted = false;
	/** @type {any} */
	let loanResult = null;

	let vaultPulsing = false;
	let bgCanvas;
	let canvasContext;
	let animationFrame;
	let artElements = [];
	const GRID_SIZE = 120;
	const MAX_ELEMENTS = 80;
	const SPAWN_INTERVAL = 600; // ms between spawns
	let lastSpawnTime = 0;

	// Live data state (keeps form inputs intact)
	let resources = structuredClone(data.resources);
	let transactions = data.transactions ?? [];
	let interestCurve = structuredClone(data.interestCurve);
	let marketsClosed = data.marketsClosed ?? false;
	$: selectedCurve = interestCurve?.[selectedResource] ?? interestCurve?.default ?? interestCurve;

	$: calculatedRepayment = loanAmount
		? calculateRepayment(parseInt(loanAmount), repaymentYears, selectedResource)
		: null;

	$: monthlyRepayment = calculatedRepayment
		? Math.ceil(calculatedRepayment.total / (repaymentYears * 12))
		: null;

	/**
	 * Calculate repayment amount
	 * @param {number} principal
	 * @param {number} years
	 */
	function calculateRepayment(principal, years, resourceType) {
		const curve = interestCurve?.[resourceType] ?? interestCurve?.default ?? interestCurve;
		const { baseRate, amplitude, decay, minRate } = curve;

		if (years < 0 || years > 30) return null;

		const rate = baseRate - amplitude * Math.exp(-decay * years);
		const finalRate = Math.max(minRate, Math.min(baseRate, rate));
		const interest = principal * finalRate;
		const total = principal + interest;

		return {
			rate: (finalRate * 100).toFixed(2),
			interest: Math.round(interest),
			total: Math.round(total)
		};
	}

	function handleLoanSubmit() {
		loanSubmitted = true;
		if (form?.success) {
			loanResult = form.transaction;
			borrowerName = '';
			loanAmount = '';
			repaymentYears = 2;
			setTimeout(() => {
				loanSubmitted = false;
			}, 5000);
		}
	}

	// When the server responds, clear the processing state and sync latest transaction
	$: if (form?.transaction && loanSubmitted) {
		loanResult = form.transaction;
		borrowerName = '';
		loanAmount = '';
		repaymentYears = 2;
		loanSubmitted = false;
	}

	$: if (form?.error && loanSubmitted) {
		loanSubmitted = false;
	}

	function handleBossAdvice() {
		adviseFetching = true;
	}

	$: if (form?.advice) {
		bossAdvice = form.advice;
		adviseFetching = false;
		bossQuestion = '';
	}

	// Auto-refresh vault and inputs every 30 seconds
	onMount(() => {
		// Initialize canvas background
		if (bgCanvas) {
			const resize = () => {
				bgCanvas.width = window.innerWidth;
				bgCanvas.height = window.innerHeight;
			};
			resize();
			window.addEventListener('resize', resize);

			canvasContext = bgCanvas.getContext('2d');
			startArtDecoAnimation();
		}

		const refreshInterval = setInterval(async () => {
			try {
				const res = await fetch('/mafia/api');
				if (!res.ok) return;
				const payload = await res.json();
				resources = payload.resources ?? resources;
				transactions = payload.transactions ?? transactions;
				interestCurve = payload.interestCurve ?? interestCurve;
				marketsClosed = payload.marketsClosed ?? marketsClosed;

				// Trigger vault update animation
				vaultPulsing = true;
				setTimeout(() => {
					vaultPulsing = false;
				}, 600);
			} catch (err) {
				// ignore polling errors
			}
		}, 30000); // 30 seconds

		return () => {
			clearInterval(refreshInterval);
			if (animationFrame) cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', resize);
		};
	});

	function startArtDecoAnimation() {
		const ctx = canvasContext;
		let lastTime = performance.now();

		function animate(currentTime) {
			const deltaTime = currentTime - lastTime;
			lastTime = currentTime;

			// Clear canvas
			ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

			// Spawn new elements periodically
			if (currentTime - lastSpawnTime > SPAWN_INTERVAL && artElements.length < MAX_ELEMENTS) {
				spawnArtElement();
				lastSpawnTime = currentTime;
			}

			// Update and draw all elements
			artElements = artElements.filter((el) => {
				el.age += deltaTime;
				const progress = el.age / el.drawDuration;
				const fadeProgress = (el.age - el.drawDuration) / el.fadeDuration;

				// Remove if fully faded
				if (fadeProgress > 1) return false;

				// Calculate alpha: draw in, stay visible, fade out
				let alpha = el.baseAlpha;
				if (progress < 1) {
					// Drawing phase
					alpha *= Math.min(1, progress * 2);
				} else if (fadeProgress > 0) {
					// Fading phase
					alpha *= 1 - fadeProgress;
				}

				drawElement(el, Math.min(1, progress), alpha);
				return true;
			});

			animationFrame = requestAnimationFrame(animate);
		}

		animate(performance.now());
	}

	function spawnArtElement() {
		const cols = Math.ceil(bgCanvas.width / GRID_SIZE);
		const rows = Math.ceil(bgCanvas.height / GRID_SIZE);
		const gridX = Math.floor(Math.random() * cols);
		const gridY = Math.floor(Math.random() * rows);
		const x = gridX * GRID_SIZE + GRID_SIZE / 2;
		const y = gridY * GRID_SIZE + GRID_SIZE / 2;

		const types = ['ray', 'chevron', 'arc', 'diamond', 'hexagon', 'fan'];
		const type = types[Math.floor(Math.random() * types.length)];

		artElements.push({
			type,
			x,
			y,
			angle: Math.random() * Math.PI * 2,
			size: 40 + Math.random() * 400,
			age: 0,
			drawDuration: 8000 + Math.random() * 1500,
			fadeDuration: 16000 + Math.random() * 2000,
			baseAlpha: 0.08 + Math.random() * 0.2,
			lineWidth: 1 + Math.random() * 10
		});
	}

	function drawElement(el, progress, alpha) {
		const ctx = canvasContext;
		ctx.save();
		ctx.translate(el.x, el.y);
		ctx.rotate(el.angle);
		ctx.strokeStyle = `rgba(212, 165, 116, ${alpha})`;
		ctx.lineWidth = el.lineWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		switch (el.type) {
			case 'ray':
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(el.size * progress, 0);
				ctx.stroke();
				break;

			case 'chevron':
				const chevW = el.size * progress;
				ctx.beginPath();
				ctx.moveTo(-chevW / 2, -chevW / 3);
				ctx.lineTo(0, chevW / 3);
				ctx.lineTo(chevW / 2, -chevW / 3);
				ctx.stroke();
				break;

			case 'arc':
				ctx.beginPath();
				ctx.arc(0, 0, el.size / 2, 0, Math.PI * 2 * progress);
				ctx.stroke();
				break;

			case 'diamond':
				const dSize = el.size / 2;
				const points = [
					[0, -dSize],
					[dSize, 0],
					[0, dSize],
					[-dSize, 0],
					[0, -dSize]
				];
				// Calculate total path length
				let totalLen = 0;
				for (let i = 1; i < points.length; i++) {
					const dx = points[i][0] - points[i - 1][0];
					const dy = points[i][1] - points[i - 1][1];
					totalLen += Math.hypot(dx, dy);
				}
				// Draw up to progress point
				const targetLen = totalLen * progress;
				let currentLen = 0;
				ctx.beginPath();
				ctx.moveTo(points[0][0], points[0][1]);
				for (let i = 1; i < points.length; i++) {
					const dx = points[i][0] - points[i - 1][0];
					const dy = points[i][1] - points[i - 1][1];
					const segLen = Math.hypot(dx, dy);
					if (currentLen + segLen <= targetLen) {
						ctx.lineTo(points[i][0], points[i][1]);
						currentLen += segLen;
					} else {
						const remaining = targetLen - currentLen;
						const ratio = remaining / segLen;
						ctx.lineTo(points[i - 1][0] + dx * ratio, points[i - 1][1] + dy * ratio);
						break;
					}
				}
				ctx.stroke();
				break;

			case 'hexagon':
				const hSize = el.size / 2;
				const hexPoints = [];
				for (let i = 0; i < 6; i++) {
					const angle = (Math.PI / 3) * i;
					hexPoints.push([Math.cos(angle) * hSize, Math.sin(angle) * hSize]);
				}
				hexPoints.push(hexPoints[0]); // Close the hexagon
				// Calculate total path length
				let hexLen = 0;
				for (let i = 1; i < hexPoints.length; i++) {
					const dx = hexPoints[i][0] - hexPoints[i - 1][0];
					const dy = hexPoints[i][1] - hexPoints[i - 1][1];
					hexLen += Math.hypot(dx, dy);
				}
				// Draw up to progress point
				const hexTarget = hexLen * progress;
				let hexCurrent = 0;
				ctx.beginPath();
				ctx.moveTo(hexPoints[0][0], hexPoints[0][1]);
				for (let i = 1; i < hexPoints.length; i++) {
					const dx = hexPoints[i][0] - hexPoints[i - 1][0];
					const dy = hexPoints[i][1] - hexPoints[i - 1][1];
					const segLen = Math.hypot(dx, dy);
					if (hexCurrent + segLen <= hexTarget) {
						ctx.lineTo(hexPoints[i][0], hexPoints[i][1]);
						hexCurrent += segLen;
					} else {
						const remaining = hexTarget - hexCurrent;
						const ratio = remaining / segLen;
						ctx.lineTo(hexPoints[i - 1][0] + dx * ratio, hexPoints[i - 1][1] + dy * ratio);
						break;
					}
				}
				ctx.stroke();
				break;

			case 'fan':
				const rays = 5;
				const fanAngle = Math.PI / 3;
				// Draw all rays but with progressive length
				for (let i = 0; i < rays; i++) {
					const angle = -fanAngle / 2 + (fanAngle / (rays - 1)) * i;
					// Each ray completes progressively based on progress
					const rayProgress = Math.max(0, progress - i / rays) * rays;
					if (rayProgress > 0) {
						ctx.beginPath();
						ctx.moveTo(0, 0);
						ctx.lineTo(
							Math.cos(angle) * el.size * Math.min(1, rayProgress),
							Math.sin(angle) * el.size * Math.min(1, rayProgress)
						);
						ctx.stroke();
					}
				}
				break;
		}

		ctx.restore();
	}

	// --- Phone the Boss Section State ---
	let phoneBossActive = structuredClone(data.phoneBossEnabled); // TODO: Replace with real toggle from management page
	let callInProgress = false;
	let dialupAudio;
	let elevatorAudio;
	let callStep = 0; // 0 = idle, 1 = dialing, 2 = waiting
	let callTimeout;
	let extraDelay;

	const phoneBossSaying = 'Sometimes, the best advice comes with a dial tone.';

	function startPhoneBoss() {
		callInProgress = true;
		callStep = 1;
		dialupAudio.currentTime = 0;
		dialupAudio.play();
		callTimeout = setTimeout(() => {
			callStep = 2;
			dialupAudio.pause();
			elevatorAudio.currentTime = 0;
			elevatorAudio.play();
			extraDelay = setTimeout(() => {
				startHoldMessages();
			}, 3000);
		}, 10000);
	}

	function hangupPhoneBoss() {
		callInProgress = false;
		callStep = 0;
		dialupAudio.pause();
		elevatorAudio.pause();
		clearTimeout(callTimeout);
		clearTimeout(extraDelay);
		stopHoldMessages(); // <--- add this
	}

	// Hold message logic for suspense
	const holdMessages = [
		'Connecting to the boss...',
		'This is what you get for using AT&T.',
		'aaa',
		'Your call is very important to us.',
		'Still waiting... the boss is busy counting credits.',
		'Did you try turning it off and on again?',
		'Please hold. The boss is negotiating with a cockroach union.',
		"Thank you for your patience. Or what's left of it.",
		'Transferring you to someone who cares...',
		'All our bugs are currently helping other customers.',
		'The boss will be with you shortly. Maybe.',
		'Do not redeem gift cards for credits during the call.',
		'Please have your franchise ID ready.',
		'Customers with entomophobia may experience longer wait times.'
	];
	let currentHoldMsg = '';
	let holdMsgInterval;

	function startHoldMessages() {
		let used = new Set();
		function nextMsg() {
			if (used.size === holdMessages.length) used.clear();
			let idx;
			do {
				idx = Math.floor(Math.random() * holdMessages.length);
			} while (used.has(idx));
			used.add(idx);
			if (holdMessages[idx] === 'aaa') {
				currentHoldMsg =
					'You are number ' +
					Math.floor(Math.random() * 90990 + 1000) +
					' in the queue... wait time: ' +
					Math.floor(Math.random() * 120 + 30) +
					' years.';
			} else {
				currentHoldMsg = holdMessages[idx];
			}
		}
		nextMsg();
		holdMsgInterval = setInterval(nextMsg, 6000);
	}

	function stopHoldMessages() {
		clearInterval(holdMsgInterval);
		currentHoldMsg = '';
	}
</script>

<div class="mafia-bg">
	<canvas bind:this={bgCanvas} class="art-deco-canvas"></canvas>
</div>
<div class="mafia-container">
	<header class="boss-header">
		<div class="header-content">
			<h1>The Cockroach Mafia</h1>
			<p class="tagline">A family business. My way or the highway, capisce?</p>
		</div>
		<div class="boss-quote">
			<em> "Little bugs, big wins. I don't waste credits." </em>
		</div>
	</header>

	<div class="main-grid">
		<!-- Left: Loan Request Section -->
		<section class="loan-section">
			<h2>REQUEST A LOAN</h2>

			<form method="POST" action="?/submitLoan" use:enhance on:submit={handleLoanSubmit}>
				<div class="form-group">
					<label for="borrower">Your Name (Boss wants to know who you are)</label>
					<input
						type="text"
						id="borrower"
						name="borrower"
						placeholder="e.g., Valdor, the Conqueror"
						bind:value={borrowerName}
						required
					/>
				</div>

				<div class="form-group">
					<label for="resourceType">Resource Type</label>
					<select id="resourceType" name="resourceType" bind:value={selectedResource} required>
						{#each Object.keys(resources) as resourceType}
							<option value={resourceType}>
								{resourceType.replace(/_/g, ' ')} (Available: {resources[resourceType]})
							</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="amount">Loan Amount</label>
					<input
						type="number"
						id="amount"
						name="amount"
						placeholder="How much do you need?"
						bind:value={loanAmount}
						min="1"
						max={resources[selectedResource] || 0}
						required
					/>
					{#if loanAmount && parseInt(loanAmount) > (resources[selectedResource] || 0)}
						<span class="error">Not enough {selectedResource} in the vault, boss!</span>
					{/if}
				</div>

				<div class="form-group">
					<label for="repaymentYears"
						>Repayment Period (Years): <span class="years-display">{repaymentYears}</span></label
					>
					<input
						type="range"
						id="repaymentYears"
						name="yearsForRepayment"
						bind:value={repaymentYears}
						min="2"
						max="30"
						step="0.5"
					/>
					<span class="range-hint">Repay quietly in easy monthly cuts.</span>
				</div>

				<!-- Repayment Calculator Display -->
				{#if monthlyRepayment}
					<div class="repayment-calc">
						<h3>The Deal:</h3>
						<div class="calc-details">
							<div class="calc-row">
								<span class="calc-label">Loan Amount:</span>
								<span class="calc-value"
									>{parseInt(loanAmount).toLocaleString()}
									{selectedResource.replace(/_/g, ' ')}</span
								>
							</div>
							<div class="calc-row total-row">
								<span class="calc-label">Monthly Repayment:</span>
								<span class="calc-value"
									>{monthlyRepayment.toLocaleString()} {selectedResource.replace(/_/g, ' ')}</span
								>
							</div>
						</div>
						<p class="fine-print">📝 Pay on time or the bugs will find you...</p>
					</div>
				{/if}

				<button
					type="submit"
					class="submit-btn"
					disabled={marketsClosed ||
						!loanAmount ||
						parseInt(loanAmount) > (resources[selectedResource] || 0)}
				>
					{marketsClosed
						? "🚪 Market's closed — no deals today"
						: loanSubmitted
							? '⏳ Processing...'
							: '✍️ Accept the Deal'}
				</button>
			</form>

			<!-- Loan Result -->
			{#if form?.transaction}
				{#if loanResult}
					<div class="success-message">
						<h3>🎉 Loan Approved!</h3>
						<p>{form.message}</p>
						<p class="monthly-pill">
							Monthly repayment: {Math.ceil(
								loanResult.totalRepayment / (loanResult.yearsForRepayment * 12)
							).toLocaleString()}
							{loanResult.resourceType.replace(/_/g, ' ')}
						</p>
					</div>
				{/if}
			{:else if form?.error}
				<div class="error-message">
					<h3>❌ Deal Rejected</h3>
					<p>{form.error}</p>
				</div>
			{/if}
		</section>

		<section class="boss-section">
			{#if phoneBossActive}
				<!-- Phone the Boss Section -->
				<div class="phone-boss-card">
					<h2>PHONE THE BOSS</h2>
					<p class="boss-desc">{phoneBossSaying}</p>
					{#if !callInProgress}
						<button class="boss-btn" on:click={startPhoneBoss}>Call the Boss</button>
					{:else}
						<div class="call-status">
							{#if callStep === 1}
								<p>Connecting to the boss... <span class="dialup-emoji">📡</span></p>
							{:else if callStep === 2}
								<p class="wait-msg">{@html currentHoldMsg}</p>
							{/if}
							<button class="hangup-btn" on:click={hangupPhoneBoss}>Hang Up</button>
						</div>
					{/if}
					<audio bind:this={dialupAudio} src="/src/lib/audio/dial-up-modem-01.wav" preload="auto"
					></audio>
					<audio
						bind:this={elevatorAudio}
						src="/src/lib/audio/PROJECTEUR - Astra Vision.mp3"
						preload="auto"
						loop
					></audio>
				</div>
			{:else}
				<!-- Ask the Boss -->
				<div class="ask-boss-card">
					<h2>ASK THE BOSS</h2>
					<p class="boss-desc">
						Got a question? Need some wisdom? The boss is in a good mood today...
					</p>

					<form method="POST" action="?/askBoss" use:enhance on:submit={handleBossAdvice}>
						<div class="form-group">
							<input
								type="text"
								name="question"
								placeholder="What's on your mind, don?"
								bind:value={bossQuestion}
								required
							/>
						</div>
						<button type="submit" class="boss-btn" disabled={adviseFetching || !bossQuestion}>
							{adviseFetching ? '🤔 Boss is thinking...' : '💬 Ask'}
						</button>
					</form>

					{#if bossAdvice}
						<div class="boss-advice">
							<div class="advice-bubble">
								{bossAdvice}
							</div>
							{#if form?.fallback}
								<p class="fallback-note">(Boss is feeling generous today...)</p>
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Resource Status -->
			<div class="resources-card" class:vault-refreshing={vaultPulsing}>
				<h2>VAULT STATUS</h2>
				<div class="resources-grid">
					{#each Object.entries(resources) as [resource, amount]}
						<div class="resource-item">
							<span class="resource-name">{resource.replace(/_/g, ' ')}</span>
							<span class="resource-amount">{amount.toLocaleString()}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	@font-face {
		font-family: 'Library-3am';
		src: url('$lib/fonts/LIBRARY 3 AM.OTF') format('opentype');
		font-weight: normal;
		font-style: normal;
	}

	:root {
		--art-deco-gold: #d4a574;
		--art-deco-dark: #0d0d1a;
		--art-deco-accent: #1a1a2e;
		--art-deco-bright: #ffd700;
	}

	/* Full-width animated background */
	.mafia-bg {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%);
		z-index: 0;
		overflow: hidden;
	}

	.art-deco-canvas {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		display: block;
	}

	body {
		min-height: 100vh;
		margin: 0;
		background: transparent;
	}

	.mafia-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 20px;
		color: #f5f5f5;
		font-family: 'Georgia', 'Times New Roman', serif;
		position: relative;
		z-index: 1;
	}

	.boss-header {
		text-align: center;
		margin-bottom: 40px;
		padding: 40px 30px;
		background: linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%);
		border: 4px solid var(--art-deco-gold);
		position: relative;
		box-shadow:
			0 0 0 1px rgba(212, 165, 116, 0.3),
			inset 0 0 20px rgba(212, 165, 116, 0.1),
			0 20px 60px rgba(0, 0, 0, 0.5);
	}

	/* Art Deco corner ornaments */
	.boss-header::before,
	.boss-header::after {
		content: '◆';
		position: absolute;
		font-size: 2em;
		color: var(--art-deco-gold);
		top: 15px;
	}

	.boss-header::before {
		left: 20px;
	}

	.boss-header::after {
		right: 20px;
	}

	.header-content {
		position: relative;
		z-index: 1;
	}

	.boss-header h1 {
		margin: 0;
		font-size: 3em;
		color: var(--art-deco-bright);
		text-shadow: 3px 3px 0px rgba(0, 0, 0, 0.7);
		letter-spacing: 4px;
		font-weight: bold;
		text-transform: uppercase;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.tagline {
		margin: 10px 0 0 0;
		font-size: 1.1em;
		color: #c0a080;
		font-style: italic;
		letter-spacing: 2px;
	}

	.boss-quote {
		margin-top: 20px;
		padding: 15px 20px;
		border-top: 2px solid var(--art-deco-gold);
		border-bottom: 2px solid var(--art-deco-gold);
		font-size: 0.95em;
		color: var(--art-deco-bright);
		font-style: italic;
	}

	.main-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 30px;
		margin-bottom: 30px;
	}

	@media (max-width: 1024px) {
		.main-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Loan Section */
	.loan-section {
		background: linear-gradient(135deg, #1a1a2e 0%, #0f1a2e 100%);
		border: 3px solid var(--art-deco-gold);
		padding: 30px;
		box-shadow:
			0 0 0 1px rgba(212, 165, 116, 0.3),
			inset 0 0 20px rgba(212, 165, 116, 0.05),
			0 15px 40px rgba(0, 0, 0, 0.6);
		position: relative;
	}

	.loan-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--art-deco-gold), transparent 50%, var(--art-deco-gold));
	}

	.loan-section h2 {
		margin-top: 0;
		color: var(--art-deco-bright);
		border-bottom: 3px double var(--art-deco-gold);
		padding-bottom: 12px;
		margin-bottom: 25px;
		font-size: 1.6em;
		letter-spacing: 2px;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.form-group {
		margin-bottom: 20px;
		display: flex;
		flex-direction: column;
	}

	.form-group label {
		color: var(--art-deco-bright);
		font-weight: bold;
		margin-bottom: 8px;
		font-size: 0.95em;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.form-group input,
	.form-group select {
		padding: 12px 15px;
		background: #0d0d1a;
		color: #f5f5f5;
		border: 2px solid var(--art-deco-gold);
		font-size: 1em;
		font-family: inherit;
		transition: all 0.3s ease;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		background: #1a1a2e;
		border-color: var(--art-deco-bright);
		box-shadow:
			0 0 15px rgba(255, 215, 0, 0.3),
			inset 0 0 10px rgba(255, 215, 0, 0.1);
	}

	.form-group input[type='range'] {
		cursor: pointer;
		height: 8px;
		padding: 0;
		accent-color: var(--art-deco-bright);
		border: none;
		background: linear-gradient(90deg, var(--art-deco-gold) 0%, var(--art-deco-bright) 100%);
	}

	.years-display {
		color: var(--art-deco-bright);
		font-weight: bold;
		margin-left: 10px;
		font-size: 1.1em;
	}

	.range-hint {
		font-size: 0.85em;
		color: #a0a080;
		margin-top: 8px;
		letter-spacing: 0.5px;
	}

	.error {
		color: #ff6b6b;
		font-size: 0.9em;
		margin-top: 5px;
	}

	.repayment-calc {
		background: linear-gradient(135deg, #1a1a2e, #0f1a2e);
		border: 2px solid var(--art-deco-gold);
		padding: 20px;
		margin: 25px 0;
		box-shadow: inset 0 0 15px rgba(212, 165, 116, 0.1);
		position: relative;
	}

	.repayment-calc::before {
		content: '◈';
		position: absolute;
		top: -12px;
		left: 20px;
		font-size: 1.5em;
		color: var(--art-deco-gold);
		background: linear-gradient(135deg, #1a1a2e 0%, #0f1a2e 100%);
		padding: 0 8px;
	}

	.repayment-calc h3 {
		margin: 0 0 15px 0;
		color: var(--art-deco-bright);
		font-size: 1.2em;
		text-transform: uppercase;
		letter-spacing: 2px;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.calc-details {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.calc-row {
		display: flex;
		justify-content: space-between;
		padding: 12px 0;
		border-bottom: 1px solid rgba(212, 165, 116, 0.3);
	}

	.calc-row.total-row {
		border-bottom: none;
		margin-top: 8px;
		padding-top: 15px;
		border-top: 2px solid var(--art-deco-gold);
		font-weight: bold;
		color: var(--art-deco-bright);
		font-size: 1.1em;
	}

	.calc-row.interest-row {
		color: #ff8c00;
	}

	.monthly-pill {
		margin-top: 10px;
		padding: 10px 12px;
		background: rgba(255, 215, 0, 0.12);
		border: 1px solid rgba(255, 215, 0, 0.4);
		display: inline-block;
		border-radius: 4px;
		color: var(--art-deco-bright);
		font-weight: 700;
	}

	.calc-label {
		color: #b8a080;
		font-weight: 500;
	}

	.calc-value {
		color: var(--art-deco-bright);
		font-weight: bold;
	}

	.fine-print {
		margin: 12px 0 0 0;
		font-size: 0.85em;
		color: #a0a080;
		font-style: italic;
	}

	.submit-btn {
		width: 100%;
		padding: 14px;
		background: linear-gradient(135deg, var(--art-deco-gold), #b8860b);
		color: #0d0d1a;
		border: 2px solid var(--art-deco-bright);
		font-weight: bold;
		font-size: 1em;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-top: 20px;
		text-transform: uppercase;
		letter-spacing: 2px;
		box-shadow: 0 5px 20px rgba(212, 165, 116, 0.3);
	}

	.submit-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--art-deco-bright), var(--art-deco-gold));
		transform: translateY(-3px);
		box-shadow: 0 8px 30px rgba(255, 215, 0, 0.4);
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-message {
		background: linear-gradient(135deg, #1a3a1a, #0f2d0f);
		border: 2px solid #4caf50;
		border-radius: 0;
		padding: 20px;
		margin-top: 20px;
		animation: slideIn 0.3s ease;
	}

	.success-message h3 {
		margin: 0 0 10px 0;
		color: #4caf50;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.success-message p {
		margin: 0 0 10px 0;
		color: #f5f5f5;
	}

	.error-message {
		background: linear-gradient(135deg, #3a1a1a, #2d0f0f);
		border: 2px solid #ff6b6b;
		padding: 20px;
		margin-top: 20px;
		animation: slideIn 0.3s ease;
	}

	.error-message h3 {
		margin: 0 0 10px 0;
		color: #ff6b6b;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.error-message p {
		margin: 0;
		color: #f5f5f5;
	}

	.transaction-details {
		margin-top: 10px;
	}

	.transaction-details summary {
		cursor: pointer;
		color: var(--art-deco-gold);
		font-size: 0.9em;
	}

	.transaction-details pre {
		background: #0d0d1a;
		padding: 10px;
		overflow-x: auto;
		font-size: 0.8em;
		color: #a0a080;
		margin: 10px 0 0 0;
	}

	@keyframes slideIn {
		from {
			transform: translateY(-10px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes vaultPulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.9;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes vaultGlow {
		0%,
		100% {
			box-shadow:
				inset 0 0 10px rgba(212, 165, 116, 0.05),
				0 0 0 rgba(255, 215, 0, 0.2);
		}
		50% {
			box-shadow:
				inset 0 0 15px rgba(212, 165, 116, 0.15),
				0 0 20px rgba(255, 215, 0, 0.4);
		}
	}

	@keyframes shimmer {
		0% {
			background-position: -1000px 0;
		}
		100% {
			background-position: 1000px 0;
		}
	}

	.boss-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ask-boss-card,
	.resources-card {
		background: linear-gradient(135deg, #1a1a2e 0%, #0f1a2e 100%);
		border: 3px solid var(--art-deco-gold);
		padding: 30px;
		box-shadow:
			0 0 0 1px rgba(212, 165, 116, 0.3),
			inset 0 0 20px rgba(212, 165, 116, 0.05),
			0 15px 40px rgba(0, 0, 0, 0.6);
		position: relative;
	}

	.ask-boss-card::before,
	.resources-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, var(--art-deco-gold), transparent 50%, var(--art-deco-gold));
	}

	.ask-boss-card h2,
	.resources-card h2 {
		margin-top: 0;
		color: var(--art-deco-bright);
		border-bottom: 3px double var(--art-deco-gold);
		padding-bottom: 12px;
		margin-bottom: 20px;
		font-size: 1.5em;
		letter-spacing: 2px;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.boss-desc {
		color: #c0a080;
		margin: 0 0 15px 0;
		font-style: italic;
	}

	.ask-boss-card form {
		display: flex;
		gap: 10px;
	}

	.ask-boss-card .form-group {
		flex: 1;
		margin-bottom: 0;
	}

	.ask-boss-card input {
		width: 100%;
	}

	.boss-btn {
		padding: 12px 25px;
		background: linear-gradient(135deg, var(--art-deco-gold), #b8860b);
		color: #0d0d1a;
		border: 2px solid var(--art-deco-bright);
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		white-space: nowrap;
		align-self: flex-end;
		text-transform: uppercase;
		letter-spacing: 1px;
		box-shadow: 0 4px 15px rgba(212, 165, 116, 0.2);
	}

	.boss-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--art-deco-bright), var(--art-deco-gold));
		transform: scale(1.05);
		box-shadow: 0 6px 25px rgba(255, 215, 0, 0.3);
	}

	.boss-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.boss-advice {
		margin-top: 20px;
		animation: slideIn 0.4s ease;
	}

	.advice-bubble {
		background: linear-gradient(135deg, #1a1a2e, #0f1a2e);
		border: 2px solid var(--art-deco-gold);
		border-left: 5px solid var(--art-deco-bright);
		padding: 18px;
		color: #f5f5f5;
		font-style: italic;
		line-height: 1.8;
		box-shadow:
			inset 0 0 15px rgba(212, 165, 116, 0.1),
			0 5px 20px rgba(0, 0, 0, 0.3);
		position: relative;
	}

	.advice-bubble::before {
		content: '"';
		position: absolute;
		left: 8px;
		top: -5px;
		font-size: 3em;
		color: var(--art-deco-gold);
		opacity: 0.3;
	}

	.fallback-note {
		font-size: 0.85em;
		color: #a0a080;
		margin-top: 8px;
		text-align: right;
	}

	.resources-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 15px;
	}

	.resource-item {
		display: flex;
		justify-content: space-between;
		padding: 15px;
		background: linear-gradient(135deg, #0d0d1a, #1a1a2e);
		border: 2px solid var(--art-deco-gold);
		box-shadow: inset 0 0 10px rgba(212, 165, 116, 0.05);
		transition: all 0.3s ease;
	}

	.vault-refreshing .resource-item {
		animation:
			vaultPulse 0.6s ease-out,
			vaultGlow 0.6s ease-out;
	}

	.resource-name {
		color: var(--art-deco-gold);
		font-weight: bold;
		text-transform: capitalize;
		letter-spacing: 1px;
	}

	.resource-amount {
		color: var(--art-deco-bright);
		font-weight: bold;
	}

	.phone-boss-card {
		background: linear-gradient(135deg, #1a1a2e 0%, #0f1a2e 100%);
		border: 3px solid var(--art-deco-gold);
		padding: 30px;
		box-shadow:
			0 0 0 1px rgba(212, 165, 116, 0.3),
			inset 0 0 20px rgba(212, 165, 116, 0.05),
			0 15px 40px rgba(0, 0, 0, 0.6);
		position: relative;
		margin-bottom: 20px;
	}

	.phone-boss-card h2 {
		margin-top: 0;
		color: var(--art-deco-bright);
		border-bottom: 3px double var(--art-deco-gold);
		padding-bottom: 12px;
		margin-bottom: 20px;
		font-size: 1.5em;
		letter-spacing: 2px;
		font-family: 'Library-3am', 'Georgia', serif;
	}

	.phone-boss-card .boss-desc {
		color: #c0a080;
		margin: 0 0 15px 0;
		font-style: italic;
	}

	.phone-boss-card .boss-btn,
	.phone-boss-card .hangup-btn {
		padding: 12px 25px;
		background: linear-gradient(135deg, var(--art-deco-gold), #b8860b);
		color: #0d0d1a;
		border: 2px solid var(--art-deco-bright);
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s ease;
		white-space: nowrap;
		align-self: flex-end;
		text-transform: uppercase;
		letter-spacing: 1px;
		box-shadow: 0 4px 15px rgba(212, 165, 116, 0.2);
		margin-top: 20px;
		margin-right: 10px;
	}

	.phone-boss-card .boss-btn:hover,
	.phone-boss-card .hangup-btn:hover {
		background: linear-gradient(135deg, var(--art-deco-bright), var(--art-deco-gold));
		transform: scale(1.05);
		box-shadow: 0 6px 25px rgba(255, 215, 0, 0.3);
	}

	.phone-boss-card .call-status {
		margin-top: 20px;
		padding: 18px;
		background: rgba(0, 0, 0, 0.15);
		border-radius: 8px;
		border: 1.5px solid var(--art-deco-gold);
		color: var(--art-deco-bright);
		font-size: 1.1em;
	}

	.phone-boss-card .wait-msg {
		color: #c0a080;
		font-style: italic;
		margin: 8px 0 0 0;
	}

	.phone-boss-card .dialup-emoji {
		font-size: 1.3em;
		vertical-align: middle;
	}
</style>
