<script>
    import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
    import { reservations } from '$lib/stores.js';

    export let rsv;

    function removeRsv(rsv) {
        var i = $reservations.length;
        while (i--) {
            if (rsv.id === $reservations[i].id) { 
                $reservations.splice(i,1);
                break;
            }
        }
    }

    const { open } = getContext('simple-modal');

	const onOkay = (data) => {
        removeRsv(data);    
    }

    export const showDialog = () => {
		open(
			CancelForm,
            {
                rsv: rsv, 
                hasForm: true,
				onOkay
            },
            {
                closeButton: false
            }
		);
	};
</script>

<button on:click={showDialog}>X</button>

