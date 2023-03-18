<script>
    import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
    import { toast, Toaster } from 'svelte-french-toast';
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

	const onCancel = (text) => {
    
    }

	const onOkay = (data) => {
        toast.success(`${data.category} reservation on ${data.date} has been canceled`); 
        removeRsv(data);    
    }

    export const showDialog = () => {
		open(
			CancelForm,
            {
                rsv: rsv, 
                hasForm: true,
				onCancel,
				onOkay
            },
            {
                closeButton: false
            }
		);
	};
</script>

<button on:click={showDialog}>X</button>

<Toaster/>

