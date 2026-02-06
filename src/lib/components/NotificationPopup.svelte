<script>
	import { storedUser as user } from '$lib/client/stores';
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';

	export let ntf;

	const { close } = getContext('simple-modal');

	const submitReceipt = async ({ form, formData, action, cancel }) => {
		close();
		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					break;
				default:
					console.error(result);
					break;
			}
		};
	};
</script>

{#if $user && ntf}
	<span class="table text-left mx-auto mb-4 dark:text-white">
		{#each ntf.message.split('\n') as msg}
			<p>{msg}</p>
		{/each}
	</span>
	<form method="POST" action="/?/submitReceipt" use:enhance={submitReceipt}>
		<input type="hidden" name="notificationId" value={ntf.id} />
		<input type="hidden" name="userId" value={$user.id} />
		<div class="flex mb-2 justify-between">
			<div class="mx-4">
				<input id="ntfAccept" type="checkbox" name="accept" />
				<label for="ntfAccept" class="dark:text-white">{ntf.checkboxMessage}</label>
			</div>
			<button type="submit" class="me-4 bg-gray-100 disabled:text-gray-400 px-3 py-1">OK</button>
		</div>
	</form>
{/if}
