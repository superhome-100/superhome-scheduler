<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { users, reservations, buoys } from '$lib/stores';
	import { beforeResCutoff } from '$lib/reservationTimes.js';
	import { Settings } from '$lib/settings';

	import { validateBuddies, checkSpaceAvailable } from '$utils/validation';

	import {
		augmentRsv,
		updateReservationFormData,
		convertReservationTypes,
		categoryIsBookable
	} from '$lib/utils.js';

	export let category = 'openwater';
	export let dateFn;
	export let hasForm = false;
	let date;

	const { close } = getContext('simple-modal');

	const submitReservation = async ({ form, data, action, cancel }) => {
		updateReservationFormData(data);

		let submitted = convertReservationTypes(Object.fromEntries(data));

		if (!Settings.get('openForBusiness', submitted.date)) {
			popup('We are closed on this date; please choose a different date');
			cancel();
			return;
		}

		const q = categoryIsBookable(submitted);
		if (q.result == false) {
			popup(q.message);
			cancel();
			return;
		}

		if (!beforeResCutoff(Settings, submitted.date, submitted.startTime, submitted.category)) {
			popup(
				'The submission window for this reservation date/time has expired. ' +
					'Please choose a later date.'
			);
			cancel();
			return;
		}

		let result = validateBuddies(submitted, $reservations);
		if (result.status === 'error') {
			popup(result.msg);
			cancel();
			return;
		}

		result = (submitted, submitted, $reservations);
		if (result.status === 'error') {
			popup(result.msg);
			cancel();
			return;
		}

		result = checkSpaceAvailable($buoys, submitted, $reservations);
		if (result.status === 'error') {
			popup(result.message);
			cancel();
			return;
		}

		close();

		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					if (result.data.status === 'success') {
						let records = result.data.records;
						for (let rsv of records) {
							let user = $users[rsv.user.id];
							rsv = augmentRsv(rsv, user);
							$reservations.push(rsv);
						}
						$reservations = [...$reservations];
						toast.success('Reservation submitted!');
					} else if (result.data.status === 'error') {
						if (result.data.code === 'RSV_EXISTS') {
							popup(
								'Reservation rejected!  You or one of your buddies has a ' +
									'pre-existing reservation at this time'
							);
						} else if (result.data.code === 'NO_SPACE_AVAILABLE') {
							popup(result.data.message);
						} else if (result.data.code === 'USER_DISABLED') {
							popup(
								'Reservation rejected! User does not have permission to ' + 'make reservations'
							);
						} else if (result.data.code === 'AFTER_CUTOFF') {
							popup(
								'The submission window for this reservation date/time has expired. ' +
									'Please choose a later date.'
							);
						}
					}
					break;
				default:
					console.error(result);
					toast.error('Submission failed with unknown error!');
					break;
			}
		};
	};
</script>

{#if hasForm}
	<div>
		<div class="form-title">reservation request</div>
		<form method="POST" action="/?/submitReservation" use:enhance={submitReservation}>
			{#if category === 'pool'}
				<ResFormPool bind:date {dateFn} bind:category />
			{:else if category === 'openwater'}
				<ResFormOpenWater bind:date {dateFn} bind:category />
			{:else if category === 'classroom'}
				<ResFormClassroom bind:date {dateFn} bind:category />
			{/if}
		</form>
	</div>
{/if}
