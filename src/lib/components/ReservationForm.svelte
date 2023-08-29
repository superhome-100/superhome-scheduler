<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { users, reservations } from '$lib/stores';
	import { Settings } from '$lib/settings';
	import {
		augmentRsv,
		buddiesAreValid,
		cleanUpFormDataBuddyFields,
		convertReservationTypes,
		categoryIsBookable
	} from '$lib/utils.js';

	export let category = 'openwater';
	export let dateFn;
	export let hasForm = false;

	let error = '';
	let date;
	const { close, hideModal, showModal } = getContext('simple-modal');

	const submitReservation = async ({ data, cancel }) => {
		error = '';
		cleanUpFormDataBuddyFields(data);

		let submitted = convertReservationTypes(Object.fromEntries(data));

		if (!buddiesAreValid(submitted)) {
			popup('Unknown buddy in buddy field!');
			cancel();
			return;
		}

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
        hideModal();

		return async ({ result }) => {
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
                    showModal();
					console.error(result);
					break;
				default:
                    showModal();
					console.error(result);
					toast.error('Submission failed with unknown error!');
					break;
			}
		};
	};
</script>

{#if hasForm}
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
