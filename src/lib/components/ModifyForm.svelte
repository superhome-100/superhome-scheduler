<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { canSubmit, user, users, reservations, buoys } from '$lib/stores';
	import { beforeCancelCutoff, beforeResCutoff } from '$lib/reservationTimes.js';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { Settings } from '$lib/settings.js';
	import {
		checkNoOverlappingRsvs,
		checkSpaceAvailable,
		validateBuddies
	} from '$lib/validationUtils.js';

	import {
		addMissingFields,
		augmentRsv,
		removeRsv,
		updateReservationFormData,
		convertReservationTypes,
		categoryIsBookable
	} from '$lib/utils.js';

	export let hasForm = false;
	export let rsv;

	const { close } = getContext('simple-modal');

	const reservationChanges = (submitted, original) => {
		const isEmpty = (v) => v == null || v == '' || (Object.hasOwn(v, 'length') && v.length == 0);
		const bothEmpty = (a, b) => isEmpty(a) && isEmpty(b);

		for (let field in submitted) {
			if (field === 'user') {
				continue;
			}

			let a = original[field];
			let b = submitted[field];

			if (bothEmpty(a, b)) {
				continue;
			}

			if (field === 'buddies') {
				if (a == null || b == null) {
					return 'buddies';
				}
				if (a.length != b.length) {
					return 'buddies';
				}
				for (let id of a) {
					if (!b.includes(id)) {
						return 'buddies';
					}
				}
			} else if (a !== b) {
				return field;
			}
		}
		return null;
	};

	const updateReservation = async ({ form, data, action, cancel }) => {
		updateReservationFormData(data, rsv.category);
		data.set('category', rsv.category);

		let submitted = convertReservationTypes(Object.fromEntries(data));
		addMissingFields(submitted, rsv);

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

		let change = reservationChanges(submitted, rsv);
		if (change == null) {
			cancel();
			close();
			return;
		}

		data.append('oldBuddies', JSON.stringify(rsv.buddies));

		if (!beforeCancelCutoff(Settings, submitted.date, submitted.startTime, submitted.category)) {
			popup(`The modification window for this reservation has expired; 
                this reservation can no longer be modified`);
			cancel();
		}

		let result = checkNoOverlappingRsvs(Settings, rsv, submitted, $reservations);
		if (result.status === 'error') {
			popup(result.msg);
			cancel();
			return;
		}

		result = checkSpaceAvailable(Settings, $buoys, submitted, $reservations);
		if (result.status === 'error') {
			popup(result.message);
			cancel();
			return;
		}

		result = validateBuddies(submitted, $reservations);
		if (result.status == 'error') {
			popup(result.msg);
			cancel();
			return;
		}

		close();

		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					if (result.data.status === 'success') {
						let records = result.data.records;
						for (let rsv of records.modified) {
							let user = $users[rsv.user.id];
							removeRsv(rsv.id);
							rsv = augmentRsv(rsv, user);
							$reservations.push(rsv);
						}
						for (let rsv of records.created) {
							let user = $users[rsv.user.id];
							rsv = augmentRsv(rsv, user);
							$reservations.push(rsv);
						}
						for (let rsv of records.canceled) {
							removeRsv(rsv.id);
						}
						$reservations = [...$reservations];
						toast.success('Reservation updated!');
					} else if (result.data.status === 'error') {
						if (result.data.code === 'RSV_EXISTS') {
							popup(
								'Reservation rejected!  You or one of your ' +
									'buddies has a pre-existing reservation at this time'
							);
						} else if (result.data.code === 'NO_SPACE_AVAILABLE') {
							popup(result.data.message);
						}
					}
					break;
				default:
					console.error(result);
					toast.error('Update failed with unknown error!');
					break;
			}
		};
	};

	let restrictModify = !beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category);
</script>

{#if hasForm}
	<div>
		<div class="form-title">modify reservation</div>
		<form method="POST" action="/?/updateReservation" use:enhance={updateReservation}>
			<input type="hidden" name="id" value={rsv.id} />
			{#if rsv.category === 'pool'}
				<ResFormPool {restrictModify} {rsv} />
			{:else if rsv.category === 'openwater'}
				<ResFormOpenWater {restrictModify} {rsv} />
			{:else if rsv.category === 'classroom'}
				<ResFormClassroom {rsv} />
			{/if}
		</form>
	</div>
{/if}
