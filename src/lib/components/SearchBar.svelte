<script>
	import { onMount } from 'svelte';

	export let openSearchOnGo = true; //redirects to the search page when the search button is clicked
	export let resultsUplift = []; // Array to hold pass search results to the parent page. Only used if non-null. We pass by reference.
	export let hasSearched = false; // Flag to indicate if a search has been performed

	function handleSearch(event) {
		hasSearched = true; // Set the flag to indicate a search has been performed
		const searchTerm = event.target.value.toLowerCase();
		const searchBarElement = document.getElementById('positiveMatch');

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

		let results = fetch(
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
		let categoryFetch = fetch('/api/get/categories')
			.then((response) => response.json())
			.then((data) => {
				const categoryContainer = document.getElementById('categoryContainer');
				categoryContainer.innerHTML = ''; // Clear previous options
				data.forEach((category) => {
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

		let authorFetch = fetch('/api/get/authors')
			.then((response) => response.json())
			.then((data) => {
				const authorFilter = document.getElementById('authorFilter');
				authorFilter.innerHTML = '<option value="">Select Author</option>'; // Clear previous options
				data.forEach((author) => {
					const option = document.createElement('option');
					option.value = author;
					option.textContent = author;
					authorFilter.appendChild(option);
				});
			});

		//show the filter input section
		const filterInput = document.querySelector('.filter-input');
		filterInput.style.display = 'flex';
	}
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
	{#if 1 == 2}
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
		min-width: 20em;
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
