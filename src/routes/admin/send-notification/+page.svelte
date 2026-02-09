<script lang="ts">
	// State management for RequestBody
	let payload = {
		title: '',
		body: '',
		happeningInTheNextHours: '24',
		category: '',
		owTime: ''
	};

	let loading = false;
	let result: { status: string; error?: string } | null = null;

	async function sendPostRequest() {
		loading = true;
		result = null;

		try {
			const response = await fetch('/api/notification/reservations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...payload,
					// Ensure optional fields are sent as undefined if empty
					category: payload.category || undefined,
					owTime: payload.owTime || undefined
				})
			});
			result = await response.json();
		} catch (e) {
			result = { status: 'error', error: String(e) };
		} finally {
			loading = false;
		}
	}
</script>

The following implementation organizes the input fields into a structured table format using Svelte
4. This ensures each attribute of the RequestBody interface is mapped to a specific row with its
corresponding description. Svelte 4 Implementation Svelte
<form on:submit|preventDefault={sendPostRequest}>
	<table>
		<thead>
			<tr>
				<th>Parameter</th>
				<th>Description</th>
				<th>Input</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td><strong>title</strong></td>
				<td>The heading of the push notification.</td>
				<td><input type="text" bind:value={payload.title} required /></td>
			</tr>
			<tr>
				<td><strong>body</strong></td>
				<td>The primary message content.</td>
				<td><textarea bind:value={payload.body} required /></td>
			</tr>
			<tr>
				<td><strong>happeningInTheNextHours</strong></td>
				<td>Time window filter for Reservations.</td>
				<td><input type="number" bind:value={payload.happeningInTheNextHours} required /></td>
			</tr>
			<tr>
				<td><strong>category</strong></td>
				<td>Optional filter for specific reservation types.</td>
				<td><input type="text" bind:value={payload.category} /></td>
			</tr>
			<tr>
				<td><strong>owTime</strong></td>
				<td>Override time or specific scheduling parameter.</td>
				<td><input type="text" bind:value={payload.owTime} /></td>
			</tr>
		</tbody>
	</table>

	<button type="submit" disabled={loading}>
		{loading ? 'Executing POST...' : 'Submit Request'}
	</button>
</form>

{#if result}
	<div class="response-box">
		<strong>Status:</strong>
		{result.status}
		{#if result.error}<br /><strong>Error:</strong> {result.error}{/if}
	</div>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}
	th,
	td {
		border: 1px solid #ccc;
		padding: 0.5rem;
		text-align: left;
	}
	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
	}
	.response-box {
		padding: 1rem;
		border: 1px solid #444;
		background: #f4f4f4;
	}
</style>
