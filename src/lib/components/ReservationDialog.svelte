<script>
	import { getContext } from 'svelte';
	import ReservationForm from './ReservationForm.svelte';
	import ReservationButton from './ReservationButton.svelte';

	export let category = 'openwater';

	/* require date to be a fn to enable lazy evaluation since it 
    might depend on values from the database, which may not have
    loaded by the time the page renders, e.g. immediately after 
    a refresh */
	export let dateFn;
	export let onUpdate = () => null;

	const { open } = getContext('simple-modal');

	export const showDialog = () => {
		open(ReservationForm, {
			category: category,
			dateFn: dateFn,
			hasForm: true,
			onSubmit: onUpdate,
		});
	};
</script>

<div on:click={showDialog} on:keypress={showDialog}>
	<ReservationButton />
</div>
