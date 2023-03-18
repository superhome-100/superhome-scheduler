<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import { user, reservations } from '$lib/stores.js';
    import { beforeCutoff } from '$lib/ReservationTimes.js';
    import { toast, Toaster } from 'svelte-french-toast';

    export let rsv;
    export let hasForm = false;
    export let onCancel = () => {};
    export let onOkay = () => {};

    const { close } = getContext('simple-modal');
    
    function removeRsv(rsv) {
        for (let i=0; i < $reservations.length; i++) {
            if (rsv.id === $reservations[i].id) { 
                $reservations.splice(i,1);
                $reservations = [...$reservations];
                break;
            }
        }
    }

    const cancelReservation = async ({ form, data, action, cancel }) => {
        let rsv = Object.fromEntries(data);
        if (!beforeCutoff(rsv.date)) {
            alert(
                `The cancelation window for this reservation has expired; 
                reservation can no longer be canceled`
            );
            cancel();
        } else { 
            close();
        }
    
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    removeRsv(rsv);
                    toast.success(`${rsv.category} reservation on ${rsv.date} has been canceled`);
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
    <div class="submitForm">
        <form 
            method="POST" 
            action="/?/cancelReservation" 
            use:enhance={cancelReservation}
        >
            <input type="hidden" name="id" value={rsv.id}>
            <input type="hidden" name="date" value={rsv.date}>
            <input type="hidden" name="category" value={rsv.category}>
            <label>
                Really cancel {rsv.category} reservation on {rsv.date}?
                <button type="submit">Confirm</button>
            </label>
        </form>
    </div>
{/if}

<Toaster/>
