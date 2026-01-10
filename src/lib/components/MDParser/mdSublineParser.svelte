<script>
	// @ts-nocheck

	export let markdownString = '';

	function indentLevel(line) {
		let i = 0;
		let re = /^(\d+\.\s*|(\s*-))/; //Matches a digit followed by a period and a space or any number of spaces followed by a hyphen
		while (re.test(line) && i < 50) {
			//While the line matches the doIndent regex, remove the match from the line and increment the indent level
			if (line.match(/^(\s{2,}-)/)) {
				//If the line has two spaces followed by a hyphen, increment the indent level,
				// but only consume one space. This makes
				// - 1 indent
				//  - 2 indents
				line = line.slice(1); //Remove 1 space
			} else {
				line = line.replace(re, ''); //Remove the match
			}
			i++;
		}

		/// Indent level in em!
		const indent_power = 2;

		return i * indent_power;
	}

	function stripEscapeChars(str) {
		return str.replaceAll('\\', '');
	}
</script>

{#if markdownString !== ''}
	<p style="margin-left: {indentLevel(markdownString)}em;">
		{#each markdownString.split('**') as bold, index}
			{#if index % 2 === 0}
				{#each bold.split('_') as italic, index}
					{#if index % 2 === 0}
						{#each italic.split('<<') as underline, index}
							{#if index % 2 === 0}
								{#each underline.split('~~') as strikethrough, index}
									{#if index % 2 === 0}
										{stripEscapeChars(strikethrough)}
									{:else}
										<del>{stripEscapeChars(strikethrough)}</del>
									{/if}
								{/each}
							{:else}
								<u>{stripEscapeChars(underline)}</u>
							{/if}
						{/each}
					{:else}
						<em>{stripEscapeChars(italic)}</em>
					{/if}
				{/each}
			{:else}
				<strong>{stripEscapeChars(bold)}</strong>
			{/if}
		{/each}
	</p>
{/if}

<style>
	p {
		margin-bottom: 2em;
	}
</style>
