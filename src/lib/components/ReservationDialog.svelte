<script lang="ts">
	import { getContext } from 'svelte';
	import ReservationForm from './ReservationForm.svelte';
	import ReservationButton from './ReservationButton.svelte';
	import type { ReservationCategoryT } from '$types';

	export let category: 'openwater' | 'classroom' | 'pool' = 'openwater';

	/* require date to be a fn to enable lazy evaluation since it 
    might depend on values from the database, which may not have
    loaded by the time the page renders, e.g. immediately after 
    a refresh */
	export let dateFn: (arg0: ReservationCategoryT) => string;

	type ModalContext = {
		open: (component: any, props?: Record<string, any>) => void;
	};
	const { open } = getContext<ModalContext>('simple-modal');

	export const showDialog = (): void => {
		open(ReservationForm, {
			category: category,
			dateFn: dateFn,
			hasForm: true
		});
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div on:click={showDialog} on:keypress={showDialog}>
	<ReservationButton />
</div>
