<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { adminComments, reservations, user, users } from '$lib/stores';
	import { adminView } from '$lib/utils.js';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { toast } from 'svelte-french-toast';

	export let hasForm = false;
	export let rsv;

	const dispatch = createEventDispatcher();

	const { close } = getContext('simple-modal');

	const getThisRsvAdminComments = (rsv, adminComments) => {
		if (adminComments[rsv.date]) {
			for (let ac of adminComments[rsv.date]) {
				if (ac.buoy == rsv.buoy) {
					return ac.comment;
				}
			}
		}
		return '';
	};

	let thisAdminComments = getThisRsvAdminComments(rsv, $adminComments);

	const copyChanges = (rsv, upd) => {
		rsv.status = upd.status;
		if (rsv.category === 'pool') {
			rsv.lanes[0] = upd.lanes[0];
			if (upd.lanes.length > 1) {
				rsv.lanes[1] = upd.lanes[1];
			}
		} else if (rsv.category === 'openwater') {
			rsv.buoy = upd.buoy;
		} else if (rsv.category === 'classroom') {
			rsv.room = upd.room;
		}
	};

	const adminUpdate = async ({ form, data, action, cancel }) => {
		let status = action.href.includes('Confirmed')
			? 'confirmed'
			: action.href.includes('Rejected')
			? 'rejected'
			: action.href.includes('Pending')
			? 'pending'
			: undefined;
		data.set('status', status);

		if (data.has('lane2')) {
			if (
				(data.get('lane1') === 'auto' && data.get('lane2') !== 'auto') ||
				(data.get('lane1') !== 'auto' && data.get('lane2') === 'auto')
			) {
				popup('Either both lanes must be assigned or both must be auto');
				cancel();
				return;
			}
			if (data.get('lane1') !== 'auto' && data.get('lane1') === data.get('lane2')) {
				popup('Cannot assign same value for 1st and 2nd Lane');
				cancel();
				return;
			}
		}

		dispatch('submit', { rsv });

		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					let updated = result.data.rsvRecord;
					copyChanges(rsv, updated);
					$reservations = [...$reservations];
					if ('adminCommentRecord' in result.data) {
						const acRec = result.data.adminCommentRecord;
						const date = datetimeToLocalDateStr(acRec.date);
						for (let i = 0; i < $adminComments[date].length; i++) {
							if ($adminComments[date][i].id == acRec.id) {
								$adminComments[date].splice(i, 1);
								break;
							}
						}
						$adminComments[date].push(acRec);
						$adminComments = { ...$adminComments };
					}
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
			<div class="">
				<label for="admin_comments" class="dark:text-white w-[33%]">Admin Comments</label>
				<textarea
					id="adminComments"
					name="admin_comments"
					class="w-44 xs:w-52 mb-4 flex-1 text-gray-700 dark:text-white"
					bind:value={thisAdminComments}
					tabindex="4"
				/>
			</div>
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
