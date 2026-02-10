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
	let result: { status: 'success'; data: object } | { status: 'error'; error?: string } | null =
		null;

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

The following form will send push notification to all the users whom has a reservation in the next
`happeningInTheNextHours`. <br />Additionally `category` or `owTime` filter can be applied.<br />
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
				<td>
					<select bind:value={payload.category}>
						<option value="">all</option>
						<option value="openwater">openwater</option>
						<option value="pool">pool</option>
						<option value="classroom">classroom</option>
					</select>
				</td>
			</tr>
			<tr>
				<td><strong>owTime</strong></td>
				<td>Optional filter for specific reservation types.</td>
				<td>
					<select bind:value={payload.owTime}>
						<option value="">-</option>
						<option value="AM">AM</option>
						<option value="PM">PM</option>
					</select>
				</td>
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
		{#if result.status === 'success'}{JSON.stringify(result.data)}{/if}
		{#if result.status === 'error'}{JSON.stringify(result.error)}{/if}
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
	}
</style>
