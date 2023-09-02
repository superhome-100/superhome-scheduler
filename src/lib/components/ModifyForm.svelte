<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import { beforeResCutoff } from '$lib/reservationTimes';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { users, reservations } from '$lib/stores';
	import { Settings } from '$lib/settings';
	import {
		addMissingFields,
		augmentRsv,
		buddiesAreValid,
		removeRsv,
		cleanUpFormDataBuddyFields,
		convertReservationTypes,
		categoryIsBookable
	} from '$lib/utils.js';
	export let hasForm = false;
	export let rsv;

	let error = '';
	const { close, hideModal, showModal } = getContext('simple-modal');

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

	const updateReservation = async ({ data, cancel }) => {
		error = '';
		cleanUpFormDataBuddyFields(data, rsv.category);
		data.set('category', rsv.category);

		let submitted = convertReservationTypes(Object.fromEntries(data));
		addMissingFields(submitted, rsv);

		if (!buddiesAreValid(submitted)) {
			popup('Unknown buddy in buddy field!');
			cancel();
			return;
		}

		if (!Settings.getOpenForBusiness(submitted.date)) {
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
		hideModal();

		return async ({ result }) => {
			let records;
			switch (result.type) {
				case 'success':
					records = result.data.records;
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
					close();
					break;
				case 'failure':
					error = result.data.error;
					showModal();
					toast.error('Reservation rejected!');
					console.error(result);
					break;
				default:
					showModal();
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
				<ResFormPool {restrictModify} {rsv} {error} />
			{:else if rsv.category === 'openwater'}
				<ResFormOpenWater {restrictModify} {rsv} {error} />
			{:else if rsv.category === 'classroom'}
				<ResFormClassroom {rsv} {error} />
			{/if}
		</form>
	</div>
{/if}
