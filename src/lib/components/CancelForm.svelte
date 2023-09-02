<script>
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';
	import { user, users, reservations } from '$lib/stores';
	import { beforeCancelCutoff } from '$lib/reservationTimes';
	import { Settings } from '$lib/settings';
	import { toast } from 'svelte-french-toast';
	import { augmentRsv, removeRsv } from '$lib/utils.js';
	import { popup } from '$lib/components/Popup.svelte';
	import Spinner from '$lib/components/spinner.svelte';

	export let rsv;
	export let hasForm = false;

	const { close, hideModal } = getContext('simple-modal');

	const cancelReservation = async ({ data }) => {
		data.append('buddies', JSON.stringify(rsv.buddies));
		let delBuddies = [];
		for (let i = 0; i < rsv.buddies.length; i++) {
			if (data.get('buddy-' + i) === 'on') {
				delBuddies.push(rsv.buddies[i]);
			}
			data.delete('buddy-' + i);
		}
		data.append('delBuddies', JSON.stringify(delBuddies));

		hideModal();

		return async ({ result }) => {
			switch (result.type) {
				case 'success':
					let records = result.data.records;
					for (let rsv of records.modified) {
						removeRsv(rsv.id);
						let user = $users[rsv.user.id];
						rsv = augmentRsv(rsv, user);
						$reservations.push(rsv);
					}
					for (let rsv of records.canceled) {
						removeRsv(rsv.id);
					}
					$reservations = [...$reservations];
					toast.success('Reservation canceled');
					break;
				case 'failure':
					popup(result.data.error);
					break;
				default:
					console.error(result);
					toast.error('Could not cancel reservation!');
					break;
			}
			close();
		};
	};
</script>

{#if hasForm}
	<div>
		<form method="POST" action="/?/cancelReservation" use:enhance={cancelReservation}>
			<input type="hidden" name="id" value={rsv.id} />
			<input type="hidden" name="date" value={rsv.date} />
			<input type="hidden" name="category" value={rsv.category} />
			<input type="hidden" name="startTime" value={rsv.startTime} />
			<input type="hidden" name="endTime" value={rsv.endTime} />
			<input type="hidden" name="owTime" value={rsv.owTime} />
			<div class="[&>span]:inline-block my-2 text-lg dark:text-white font-semibold mr-0.5">
				<span>Really cancel {rsv.category} reservation on</span>
				<span>{rsv.date}?</span>
			</div>
			{#each rsv.buddies as buddy, i}
				<div>
					<label class="dark:text-white"
						>Also cancel {$users[buddy].nickname}'s reservation
						<input type="checkbox" name={'buddy-' + i} />
					</label>
				</div>
			{/each}
			<button class="dark:text-white dark:border-white mb-2" type="submit">Confirm</button>
		</form>
	</div>
{/if}
