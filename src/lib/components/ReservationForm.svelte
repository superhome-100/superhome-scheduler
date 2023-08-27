<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import Spinner from '$lib/components/spinner.svelte';
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

	let error = '';

	let date;

	const { close } = getContext('simple-modal');

	let submitting = false;

	const submitReservation = async ({ form, data, action, cancel }) => {
		error = '';
		updateReservationFormData(data);

		let submitted = convertReservationTypes(Object.fromEntries(data));

		// TODO: move to server
		if (!Settings.get('openForBusiness', submitted.date)) {
			popup('We are closed on this date; please choose a different date');
			cancel();
			return;
		}

		// TODO: move to server
		const q = categoryIsBookable(submitted);
		if (q.result == false) {
			popup(q.message);
			cancel();
			return;
		}
		$: submitting = true;

		return async ({ result, update }) => {
			$: submitting = false;
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
					}
					close();
					break;
				case 'failure':
					error = result.data.error;
					console.error(result);
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
	{#if submitting}
		<Spinner />
	{/if}
	<div class="px-2">
		<div class="form-title">reservation request</div>
		<form method="POST" action="/?/submitReservation" use:enhance={submitReservation}>
			{#if category === 'pool'}
				<ResFormPool bind:date {dateFn} bind:category {error} />
			{:else if category === 'openwater'}
				<ResFormOpenWater bind:date {dateFn} bind:category {error} />
			{:else if category === 'classroom'}
				<ResFormClassroom bind:date {dateFn} bind:category {error} />
			{/if}
		</form>
	</div>
{/if}
