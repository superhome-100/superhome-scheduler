<script lang="ts">
	import { getContext, createEventDispatcher } from 'svelte';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { adminView } from '$lib/utils';
	import { toast } from 'svelte-french-toast';
	import { storedUser } from '$lib/client/stores';
	import { ReservationStatus, type ReservationEx } from '$types';

	export let hasForm = false;
	export let rsv: ReservationEx;

	const dispatch = createEventDispatcher();

	const { close } = getContext('simple-modal');

	const adminUpdate = async ({ formData, action }) => {
		const toastId = toast.loading(`Updating reservation of '${rsv.user_json.nickname}'...`);

		let status: ReservationStatus | undefined = undefined;
		if (action.href.includes('Confirmed')) status = ReservationStatus.confirmed;
		else if (action.href.includes('Rejected')) status = ReservationStatus.rejected;
		else if (action.href.includes('Pending')) status = ReservationStatus.pending;
		if (status) {
			formData.set('status', status);
		}

		dispatch('submit', { rsv });

		return async ({ result, update }) => {
			toast.dismiss(toastId);
			switch (result.type) {
				case 'success':
					toast.success(`Reservation of '${rsv.user_json.nickname}' updated!`);
					if (status) rsv.status = status;
					rsv.buoy = formData.get('buoy');
					rsv = rsv;
					break;
				default:
					console.error(result);
					toast.error(`Failed to update reservation of '${rsv.user_json.nickname}'`);
					break;
			}
		};
	};
</script>

{#if hasForm}
	<form method="POST" action="/?/adminUpdateSubmit" use:enhance={adminUpdate}>
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
				{#if rsv.status !== ReservationStatus.pending}
					<button formaction="/?/adminUpdatePending" class="bg-status-pending px-3 py-1 w-1/3"
						>Pending</button
					>
				{/if}
				<button type="submit" class="px-3 py-1 w-1/3">Update</button>
				{#if rsv.status !== ReservationStatus.confirmed}
					<button formaction="/?/adminUpdateConfirmed" class="bg-status-confirmed px-3 py-1 w-1/3"
						>Confirm</button
					>
				{/if}
			</div>
		{/if}
	</form>
{/if}
