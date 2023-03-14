<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import DialogPool from './DialogPool.svelte';
    import DialogClassroom from './DialogClassroom.svelte';
    import DialogOpenWater from './DialogOpenWater.svelte';
    import { 
        canSubmit, 
        user,
        reservations, 
    } from '$lib/stores.js';
    import { minValidDateStr, datetimeToLocalDateStr } from '$lib/ReservationTimes.js';
    import { augmentRsv } from '$lib/utils.js';

    export let category = 'openwater';
    export let date;
    export let hasForm = false;
    export let onCancel = () => {};
    export let onOkay = () => {};

    const { close } = getContext('simple-modal');

    function _onCancel() {
		onCancel();
		close();
    }

    const submitReservation = ({ form, data, action, cancel }) => {
        close();
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    let rsv = augmentRsv(result.data, $user.facebookId, $user.name);
                    $reservations.push(rsv);
                    onOkay(result.data);
                    break;
                default:
                    break;
            }
        };
    };

</script>

{#if hasForm}
    <div class="submitDialog">
        <h2>Reservation Request</h2>
        <form 
            method="POST" 
            action="/?/submitReservation" 
            use:enhance={submitReservation}
        >
            <input type="hidden" name="user" value={$user.id}>
            <div><label>
                Date
                <input 
                    type="date" 
                    name="date" 
                    min={minValidDateStr()} 
                    value={datetimeToLocalDateStr(date)}
                >
            </label></div>
            <div><label>
                Category
                <select name="category" bind:value={category}>
                    <option value="pool">Pool</option>
                    <option value="openwater">Open Water</option>
                    <option value="classroom">Classroom</option>
                </select>
            </label></div>
            {#if category === 'pool'}
                <DialogPool/>
            {:else if category === 'openwater'}
                <DialogOpenWater/>
            {:else if category === 'classroom'}
                <DialogClassroom/>
            {/if}
            <div class="dialog_button">
                <button type="submit" disabled={!$canSubmit}>Submit</button>
            </div>
        </form>
    </div>
{/if}

