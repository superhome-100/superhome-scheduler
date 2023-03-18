<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import { user, reservations } from '$lib/stores.js';
    import { beforeCutoff } from '$lib/ReservationTimes.js';

    export let rsv;
    export let hasForm = false;
    export let onCancel = () => {};
    export let onOkay = () => {};

    const { close } = getContext('simple-modal');

    function _onCancel() {
		onCancel();
		close();
    }

    const cancelReservation = ({ form, data, action, cancel }) => {
        let { date }  = Object.fromEntries(data);
        if (!beforeCutoff(date)) {
            alert(
                `Reservation cancelation window has expired; 
                reservation can no longer be canceled`
            );
            cancel();
        } 
        close();
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    onOkay(result.data);
                    break;
                default:
                    break;
            }
        };
    };

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
            <label>
                Really cancel {rsv.category} reservation on {rsv.date}?
                <button type="submit">Confirm</button>
            </label>
        </form>
    </div>
{/if}

