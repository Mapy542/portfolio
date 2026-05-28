<script>
	import { onDestroy, onMount } from 'svelte';

	export let openSearchOnGo = true; //redirects to the search page when the search button is clicked
	/** @type {string[]} */
	export let resultsUplift = []; // Array to hold pass search results to the parent page. Only used if non-null. We pass by reference.
	export let hasSearched = false; // Flag to indicate if a search has been performed
	const showAdvancedSearch = false;

	function handleSearch() {
		hasSearched = true; // Set the flag to indicate a search has been performed
		const searchBarElement = document.getElementById('positiveMatch');

		if (!(searchBarElement instanceof HTMLInputElement)) {
			return;
		}

		const searchText = searchBarElement.value.split(' ').filter((word) => word !== '');
		if (searchText.length === 0) {
			resultsUplift.length = 0; // Clear results if search text is empty
			return;
		}

		// Separate positive, negative, and tag matches
		let positiveMatch = searchText.filter((word) => !word.startsWith('-') && !word.includes(':'));
		let negativeMatch = searchText
			.filter((word) => word.startsWith('-'))
			.map((word) => word.slice(1));
		let tagMatch = searchText
			.filter((word) => word.includes(':'))
			.map((word) => word.split(':')[1]);

		fetch(
			'/api/search?' +
				('positive=' + positiveMatch.join(',')) +
				'&negative=' +
				negativeMatch.join(',') +
				'&tags=' +
				tagMatch.join(',')
		)
			.then((response) => response.json())
			.then((data) => {
				// Process the search results
				if (Array.isArray(resultsUplift) && Array.isArray(data.results)) {
					resultsUplift.length = 0; // Clear the previous results
					resultsUplift.push(...data.results); // Add new results
				} else if (Array.isArray(resultsUplift)) {
					resultsUplift.length = 0; // Clear the previous results
				}
			})
			.catch((error) => {
				console.error('Error fetching search results:', error);
			});
	}

	function loadHiddenOptions() {
		fetch('/api/get/categories')
			.then((response) => response.json())
			.then((data) => {
				const categoryContainer = document.getElementById('categoryContainer');

				if (!(categoryContainer instanceof HTMLDivElement)) {
					return;
				}

				categoryContainer.innerHTML = ''; // Clear previous options
				/** @type {string[]} */
				const categories = data;

				categories.forEach((category) => {
					const checkbox = document.createElement('input');
					checkbox.type = 'checkbox';
					checkbox.id = category;
					checkbox.value = category;
					checkbox.checked = true; // Default to checked

					const label = document.createElement('label');
					label.htmlFor = category;
					label.textContent = category;

					const levelDiv = document.createElement('div');
					levelDiv.className = 'CategoryLevel';

					levelDiv.appendChild(checkbox);
					levelDiv.appendChild(label);
					categoryContainer.appendChild(levelDiv);
				});
			});

		fetch('/api/get/authors')
			.then((response) => response.json())
			.then((data) => {
				const authorFilter = document.getElementById('authorFilter');

				if (!(authorFilter instanceof HTMLSelectElement)) {
					return;
				}

				authorFilter.innerHTML = '<option value="">Select Author</option>'; // Clear previous options
				/** @type {string[]} */
				const authors = data;

				authors.forEach((author) => {
					const option = document.createElement('option');
					option.value = author;
					option.textContent = author;
					authorFilter.appendChild(option);
				});
			});

		//show the filter input section
		const filterInput = document.querySelector('.filter-input');

		if (filterInput instanceof HTMLElement) {
			filterInput.style.display = 'flex';
		}
	}

	let searchKeywordsCache = '';
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let searchTimeout;
	onMount(() => {
		searchTimeout = setInterval(() => {
			const searchInput = document.getElementById('positiveMatch');

			if (!(searchInput instanceof HTMLInputElement)) {
				return;
			}

			if (searchKeywordsCache !== searchInput.value) {
				searchKeywordsCache = searchInput.value;
				handleSearch();
			}
		}, 1000);
	});
	onDestroy(() => {
		clearInterval(searchTimeout);
	});

	$: console.log(searchKeywordsCache);
</script>

<div class="search-container">
	<div class="text-input">
		<input
			type="text"
			placeholder="Search keyword, - to filter keyword, : to search tags only..."
			id="positiveMatch"
			on:change={handleSearch}
		/>
		{#if openSearchOnGo}
			<a href="/search" on:click={() => {}}>
				<button>Go</button>
			</a>
		{:else}
			<button on:click={handleSearch}>Search</button>
		{/if}
	</div>
	{#if showAdvancedSearch}
		<button on:click={loadHiddenOptions} class="advanced-search-button">Advanced Search</button>
		<div class="filter-input">
			<div id="categoryContainer" class="categoryContainer"></div>

			<select name="author" id="authorFilter">
				<option value="">Select Author</option>
			</select>

			<input type="date" id="dateFilter" name="dateFilter" placeholder="Date" />
		</div>
	{/if}
</div>

<style>
	.search-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 1rem;
		width: 100%;
	}

	.text-input {
		display: flex;
		flex-direction: row;
		justify-content: center;
		width: 100%;
	}

	.text-input input {
		width: 75%;
	}

	.filter-input {
		display: none;
		flex-direction: row;
		align-items: center;
	}

	.advanced-search-button {
		background-color: var(--theme-bg-primary);
		color: var(--theme-text-secondary);
		border: solid 1px var(--theme-bg-primary);
		border-radius: 5%;
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all var(--transition-length);
	}
	.advanced-search-button:hover {
		background-color: var(--theme-bg-primary);
		color: var(--theme-highlight);
	}

	.filter-input select {
		height: 2em;
	}
</style>
