<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { cleanUpFormDataBuddyFields } from '$lib/utils';
	import { ReservationCategory } from '$types';

	export let category = ReservationCategory.openwater;
	export let dateFn;
	export let hasForm = false;
	export let onSubmit = () => null;

	let error = '';
	let date: string;
	const { close, hideModal, showModal } = getContext('simple-modal');

	const submitReservation = async ({ formData, cancel }) => {
		const toastId = toast.loading('Submitting reservation(s)...');

		error = '';
		console.log(formData);
		cleanUpFormDataBuddyFields(formData);
		hideModal();

		return async ({ result }) => {
			toast.dismiss(toastId);
			onSubmit();
			switch (result.type) {
				case 'success':
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
