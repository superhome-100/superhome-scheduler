<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations } from '$lib/stores.js';
    import { minValidDateStr, beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { augmentRsv, updateReservationFormData, validateBuddies } from '$lib/utils.js';

    export let category = 'openwater';
    export let date;
    export let hasForm = false;

    const { close } = getContext('simple-modal');

    const submitReservation = async ({ form, data, action, cancel }) => {
        updateReservationFormData(data);
        let result = validateBuddies(data);
        if (result.status === 'error') {
            alert(result.msg);
            cancel();
            return;
        }

        if (!beforeResCutoff(data.get('date'))) {
            alert(
                `The submission window for this reservation has expired; 
                please choose a later date`
            );
            cancel();
        }
        close();
        
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    let rsv = augmentRsv(result.data, $user.facebookId, $user.name);
                    $reservations.push(rsv);
                    $reservations = [...$reservations];
                    toast.success('Reservation submitted!');
                    break;
                default:
                    console.error(result);
                    toast.error('Submission failed with unknown error!');
                    break;
            }
        };
    };

</script>

{#if hasForm}
    <div class="submitForm">
        <h2>reservation request</h2>
        <form 
            method="POST" 
            action="/?/submitReservation" 
            use:enhance={submitReservation}
        >
            {#if category === 'pool'}
                <ResFormPool date={date} bind:category={category}/>
            {:else if category === 'openwater'}
                <ResFormOpenWater date={date} bind:category={category}/>
            {:else if category === 'classroom'}
                <ResFormClassroom date={date} bind:category={category}/>
            {/if}
       </form>
    </div>
{/if}

<Toaster/>
