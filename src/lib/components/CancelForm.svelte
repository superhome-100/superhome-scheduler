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
    
    const cancelReservation = async ({ form, data, action, cancel }) => {
        let { date }  = Object.fromEntries(data);
        if (!beforeCutoff(date)) {
            alert(
                `The cancelation window for this reservation has expired; 
                reservation can no longer be canceled`
            );
            cancel();
        } else { 
            close();
        }
    };
    
    const cancelPromise = ({ form, data, action, cancel }) => {
        let { category, date }  = Object.fromEntries(data);
        toast.promise(
            cancelReservation({ form, data, action, cancel }),
            {
                loading: 'Cancelling...',
                success: `${category} reservation on ${date} has been canceled`,
                error: 'Could not cancel reservation!'
            }
        );
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    onOkay(result.data);
                    break;
                default:
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
            use:enhance={cancelPromise}
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
