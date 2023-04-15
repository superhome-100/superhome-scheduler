<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations, buoys } from '$lib/stores.js';
    import { beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { 
        augmentRsv, 
        updateReservationFormData, 
        validateBuddies, 
        checkSpaceAvailable,
        checkDuplicateRsv,
        convertReservationTypes
    } from '$lib/utils.js';

    export let category = 'openwater';
    export let dateFn;
    export let hasForm = false;

    const { close } = getContext('simple-modal');

    const submitReservation = async ({ form, data, action, cancel }) => {
        
        updateReservationFormData(data);
        let thisRsv = convertReservationTypes(Object.fromEntries(data));
        
        if (!beforeResCutoff(thisRsv.date, thisRsv.startTime, thisRsv.category)) {
            alert(
                'The submission window for this reservation date/time has expired; ' + 
                'please choose a later date'
            );
            cancel();
            return;
        }

        if (checkDuplicateRsv(thisRsv, $reservations)) {
            alert(
                'You have an existing reservation that overlaps with this date/time; ' +
                'please either cancel that reservation, or choose a different date/time'
            );
            cancel();
            return;
        }

        let result = checkSpaceAvailable(thisRsv, $reservations, $buoys); 
        if (result.status === 'error') {
            alert(result.message);
            cancel();
            return;
        }
        
        result = validateBuddies(thisRsv);
        if (result.status === 'error') {
            alert(result.msg);
            cancel();
            return;
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
    <div>
        <div class='text-center text-2xl font-semibold my-2'>reservation request</div>
        <br/>
        <form 
            method="POST" 
            action="/?/submitReservation" 
            use:enhance={submitReservation}
        >
            {#if category === 'pool'}
                <ResFormPool date={dateFn('pool')} bind:category={category}/>
            {:else if category === 'openwater'}
                <ResFormOpenWater date={dateFn('openwater')} bind:category={category}/>
            {:else if category === 'classroom'}
                <ResFormClassroom date={dateFn('classroom')} bind:category={category}/>
            {/if}
       </form>
    </div>
{/if}

<Toaster/>
