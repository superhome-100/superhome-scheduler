<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { reservations, user, users } from '$lib/stores';
	import { adminView, removeRsv } from '$lib/utils.js';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { toast } from 'svelte-french-toast';

	export let hasForm = false;
	export let rsv;

	const dispatch = createEventDispatcher();

	const { close } = getContext('simple-modal');

	const adminUpdate = async ({ form, data, action, cancel }) => {
		let status = action.href.includes('Confirmed')
			? 'confirmed'
			: action.href.includes('Rejected')
			? 'rejected'
			: action.href.includes('Pending')
			? 'pending'
			: undefined;
		data.set('status', status);

		dispatch('submit', { rsv });

		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					let updated = result.data.record;
					removeRsv(rsv.id);
					$reservations = [...$reservations, updated];
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
		{#if adminView(true)}
			<div class="[&>*]:mx-auto w-full inline-flex items-center justify-between">
				<button formaction="/?/adminUpdateRejected" class="bg-status-rejected px-3 py-1"
					>Reject</button
				>
				<button formaction="/?/adminUpdatePending" class="bg-status-pending px-3 py-1"
					>Pending</button
				>
				<button type="submit" class="bg-status-confirmed px-3 py-1" tabindex="6">Confirm</button>
			</div>
		{/if}
	</form>
{/if}
