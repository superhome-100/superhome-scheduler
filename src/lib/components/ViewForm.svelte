<script lang="ts">
	import { getContext, createEventDispatcher } from 'svelte';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { adminView } from '$lib/utils';
	import { toast } from 'svelte-french-toast';
	import { storedUser } from '$lib/client/stores';

	export let hasForm = false;
	export let rsv;

	const dispatch = createEventDispatcher();

	const { close } = getContext('simple-modal');

	const adminUpdate = async ({ formData, action }) => {
		let status = action.href.includes('Confirmed')
			? 'confirmed'
			: action.href.includes('Rejected')
			? 'rejected'
			: action.href.includes('Pending')
			? 'pending'
			: undefined;
		formData.set('status', status);

		dispatch('submit', { rsv });

		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					toast.success('Reservation updated!');
					break;
				default:
					console.error(result);
					toast.error('Update failed with unknown error!');
					break;
			}
		};
	};
</script>

{#if hasForm}
	<form method="POST" action="/?/adminUpdateConfirmed" use:enhance={adminUpdate}>
		{#if rsv.category === 'pool'}
			<ResFormPool viewOnly {rsv} />
		{:else if rsv.category === 'openwater'}
			<ResFormOpenWater viewOnly {rsv} />
		{:else if rsv.category === 'classroom'}
			<ResFormClassroom viewOnly {rsv} />
		{/if}
		<input type="hidden" name="id" value={rsv.id} />
		{#if adminView($storedUser, true)}
			<div class="w-full flex px-8 gap-2 items-center justify-between">
				<button formaction="/?/adminUpdateRejected" class="bg-status-rejected px-3 py-1 w-1/3"
					>Reject</button
				>
				<button formaction="/?/adminUpdatePending" class="bg-status-pending px-3 py-1 w-1/3"
					>Pending</button
				>
				<button type="submit" class="bg-status-confirmed px-3 py-1 w-1/3">Confirm</button>
			</div>
		{/if}
	</form>
{/if}
