<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import DialogPool from './DialogPool.svelte';
    import DialogClassroom from './DialogClassroom.svelte';
    import DialogOpenWater from './DialogOpenWater.svelte';
    import { canSubmit } from '$lib/stores.js';
    import { minValidDateStr, datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

    export let category;
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
        let dataObj = Object.fromEntries(data);
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    onOkay(dataObj);
                    break;
                default:
                    break;
            }
            close();
        };
    };

</script>

{#if hasForm}
    <h2 class="dialog">Reservation Request</h2>
    <form method="POST" action="/?/submitReservation" use:enhance={submitReservation}>
        <div><label>
            Date
            <input type="date" name="date" min={minValidDateStr()} value={datetimeToLocalDateStr(date)}>
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
            <button on:click={_onCancel}>Cancel</button>
            <input type="submit" value="Submit" disabled={!$canSubmit}>
        </div>
    </form>
{/if}

