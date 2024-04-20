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
	import { ReservationStatus, ReservationCategory } from '$types';
	import { reject } from 'lodash';

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
			<div class="w-full flex px-8 gap-2 items-center justify-between">
				{#if rsv.status !== ReservationStatus.rejected}
					<button formaction="/?/adminUpdateRejected" class="bg-status-rejected px-3 py-1 w-1/2"
						>Reject</button
					>
				{/if}
				{#if rsv.status !== ReservationStatus.pending}
					<button formaction="/?/adminUpdatePending" class="bg-status-pending px-3 py-1 w-1/2"
						>Pending</button
					>
				{/if}
				{#if rsv.status !== ReservationStatus.confirmed}
					<button type="submit" class="bg-status-confirmed px-3 py-1 w-1/2" tabindex="6"
						>Confirm</button
					>
				{/if}
			</div>
		{/if}
	</form>
{/if}
