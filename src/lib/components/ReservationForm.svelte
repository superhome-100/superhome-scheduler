<script>
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { users, reservations } from '$lib/stores';
	import {
		augmentRsv,
		buddiesAreValid,
		cleanUpFormDataBuddyFields,
		convertReservationTypes
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

		return async ({ result }) => {
			switch (result.type) {
				case 'success':
					let records = result.data.records;
					for (let rsv of records) {
						let user = $users[rsv.user.id];
						rsv = augmentRsv(rsv, user);
						$reservations.push(rsv);
					}
					$reservations = [...$reservations];
					toast.success('Reservation submitted!');
					close();
					break;
				case 'failure':
					error = result.data.error;
					showModal();
					toast.error('Reservation rejected!');
					console.error(result);
					break;
				default:
					error = 'Unknown error!';
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
