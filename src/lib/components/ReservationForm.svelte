<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { augmentRsv } from '$lib/utils.js';

    export let category = 'openwater';
    export let date;
    export let hasForm = false;
    export let onCancel = () => {};
    export let onOkay = () => {};

    const { close } = getContext('simple-modal');

    const submitReservation = async ({ form, data, action, cancel }) => {
        close();
    };

    const submitPromise = ({ form, data, action, cancel }) => {
        toast.promise(
            submitReservation({ form, data, action, cancel }),
            {
                loading: 'Submitting...',
                success: 'Reservation submitted!',
                error: 'Could not submit reservation!'
            }
        );
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    let rsv = augmentRsv(result.data, $user.facebookId, $user.name);
                    onOkay(rsv);
                    return Promise.resolve();
                default:
                    return Promise.reject();
            }
        };
    };

</script>

{#if hasForm}
    <div class="submitForm">
        <h2>Reservation Request</h2>
        <form 
            method="POST" 
            action="/?/submitReservation" 
            use:enhance={submitPromise}
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
                <ResFormPool/>
            {:else if category === 'openwater'}
                <ResFormOpenWater/>
            {:else if category === 'classroom'}
                <ResFormClassroom/>
            {/if}
            <div class="submitButton">
                <button type="submit" disabled={!$canSubmit}>Submit</button>
            </div>
        </form>
    </div>
{/if}

<Toaster/>
