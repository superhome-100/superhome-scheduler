<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, users, reservations, buoys } from '$lib/stores.js';
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
    let date;

    const { close } = getContext('simple-modal');

    const submitReservation = async ({ form, data, action, cancel }) => {
        
        updateReservationFormData(data);
        let submitted = convertReservationTypes(Object.fromEntries(data));
        
        if (!beforeResCutoff(submitted.date, submitted.startTime, submitted.category)) {
            alert(
                'The submission window for this reservation date/time has expired; ' + 
                'please choose a later date'
            );
            cancel();
            return;
        }

        if (checkDuplicateRsv(submitted, $reservations)) {
            alert(
                'You have an existing reservation that overlaps with this date/time; ' +
                'please either cancel that reservation or choose a different date/time'
            );
            cancel();
            return;
        }

        let result = checkSpaceAvailable(submitted, $reservations, $buoys); 
        if (result.status === 'error') {
            alert(result.message);
            cancel();
            return;
        }
        
        result = validateBuddies(submitted);
        if (result.status === 'error') {
            alert(result.msg);
            cancel();
            return;
        }

        close();
        
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    if (result.data.status === 'success') {
                        let records = result.data.records;
                        for (let rsv of records) {
                            let user = $users[rsv.user.id];
                            rsv = augmentRsv(rsv, user.facebookId, user.name);
                            $reservations.push(rsv);
                        }
                        $reservations = [...$reservations];
                        toast.success('Reservation submitted!');
                    } else if (result.data.status === 'error') {
                        if (result.data.code === 'BUDDY_RSV_EXISTS') {
                            alert('Buddy reservation already exists!  Reservation rejected');
                        }
                    }
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
                <ResFormPool bind:date={date} dateFn={()=>dateFn('pool')} bind:category={category}/>
            {:else if category === 'openwater'}
                <ResFormOpenWater bind:date={date} dateFn={()=>dateFn('openwater')} bind:category={category}/>
            {:else if category === 'classroom'}
                <ResFormClassroom bind:date={date} dateFn={()=>dateFn('classroom')} bind:category={category}/>
            {/if}
       </form>
    </div>
{/if}

<Toaster/>
