<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import { user, reservations } from '$lib/stores.js';
    import { beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { toast, Toaster } from 'svelte-french-toast';
    import { removeRsv } from '$lib/utils.js';

    export let rsv;
    export let hasForm = false;

    const { close } = getContext('simple-modal');
    
    const cancelReservation = async ({ form, data, action, cancel }) => {
        let rsv = Object.fromEntries(data);
        if (!beforeCancelCutoff(rsv.date, rsv.startTime)) {
            alert(
                `The cancelation window for this reservation has expired; 
                this reservation can no longer be canceled`
            );
            cancel();
        } 
        close();

        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    removeRsv(rsv);
                    toast.success('Reservation canceled');
                    break;
                default:
                    console.error(result);
                    toast.error('Could not cancel reservation!');
                    break;
            }
        };
    }

</script>

{#if hasForm}
    <div>
        <form 
            method="POST" 
            action="/?/cancelReservation" 
            use:enhance={cancelReservation}
        >
            <input type="hidden" name="id" value={rsv.id}>
            <input type="hidden" name="date" value={rsv.date}>
            <input type="hidden" name="category" value={rsv.category}>
            <div>Really cancel {rsv.category} reservation on</div>
            <div>{rsv.date}?</div>
            <button type="submit">Confirm</button>
        </form>
    </div>
{/if}

<Toaster/>
