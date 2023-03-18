<script>
    import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
    import { reservations } from '$lib/stores.js';

    export let rsv;

    const { open } = getContext('simple-modal');

    export const showDialog = () => {
		open(
			CancelForm,
            {
                rsv: rsv, 
                hasForm: true,
            },
            {
                closeButton: false
            }
		);
	};
</script>

<button on:click={showDialog}>X</button>

