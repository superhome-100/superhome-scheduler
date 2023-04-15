<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations, buoys } from '$lib/stores.js';
    import { beforeCancelCutoff, beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { 
        augmentRsv, 
        removeRsv, 
        validateBuddies, 
        updateReservationFormData, 
        convertReservationTypes,
        checkDuplicateRsv,
        checkSpaceAvailable
    } from '$lib/utils.js';

    export let hasForm = false;
    export let rsv;

    const { close } = getContext('simple-modal');

    const reservationUnchanged = (submitted, original) => {
        const isEmpty = (v) => v == null || v == '' || (Object.hasOwn(v, 'length') && v.length == 0);
        const bothEmpty = ((a,b) => isEmpty(a) && isEmpty(b));

        for (let field in submitted) {
            if (field === 'user') { continue };
            
            let a = original[field];
            let b = submitted[field];

            if (bothEmpty(a,b)) { continue };

            if (field === 'buddies') {
                if (a == null || b == null) {
                    return false;
                }
                if (a.length != b.length) {
                    return false;
                }
                for (let id of a) {
                    if (!b.includes(id)) {
                        return false;
                    }
                }
            } else if (a !== b) {
                return false;
            }
        }
        return true;
    };

    const addMissingFields = (submitted, original) => {
        for (let field in original) {
            if (submitted[field] === undefined) {
                submitted[field] = original[field];
            }
        }
    };

    const updateReservation = async ({ form, data, action, cancel }) => {
        updateReservationFormData(data);
        let submitted = convertReservationTypes(Object.fromEntries(data));
        addMissingFields(submitted, rsv);

        if (reservationUnchanged(submitted, rsv)) {
            cancel();
            close();
            return;
        }

        if (checkDuplicateRsv(submitted, $reservations)) {
            alert(
                'You have an existing reservation that overlaps with this date/time; ' +
                'please either cancel that reservation, or choose a different date/time'
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
        if (result.status == 'error') {
            alert(result.msg);
            cancel();
            return;
        }
        if (!beforeCancelCutoff(submitted.date, submitted.startTime, submitted.category)) {
            alert(`The modification window for this reservation has expired; 
                this reservation can no longer be modified`
            );
            cancel();
        }
        close();

        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    removeRsv(rsv);

                    let updatedRsv = augmentRsv(result.data, $user.facebookId, $user.name);
                    $reservations.push(updatedRsv);
                    $reservations = [...$reservations];
                    toast.success('Reservation updated!');
                    break;
                default:
                    console.error(result);
                    toast.error('Update failed with unknown error!');
                    break;
            }
        };
    };
    
    let restrictModify = !beforeResCutoff(rsv.date, rsv.startTime, rsv.category);
    let viewOnly = !beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category) 
            || (restrictModify && rsv.resType === 'autonomous');

</script>

{#if hasForm}
    {#if viewOnly}
        <div class='mb-4'>
            <div class='text-center text-xl font-semibold my-4'>
                {rsv.user.name}
            </div>       
            {#if rsv.category === 'pool'}
                <ResFormPool viewOnly {rsv}/>
            {:else if rsv.category === 'openwater'}
                <ResFormOpenWater viewOnly {rsv}/>
            {/if}
        </div>
    {:else}
        <div>
            <div class='text-center text-2xl font-semibold my-2'>modify reservation</div>
            <form 
                method="POST" 
                action="/?/updateReservation" 
                use:enhance={updateReservation}
            >
                <input type="hidden" name="id" value={rsv.id}>
                {#if rsv.category === 'pool'}
                    <ResFormPool {restrictModify} {rsv}/>
                {:else if rsv.category === 'openwater'}
                    <ResFormOpenWater {restrictModify} {rsv}/>
                {:else if rsv.category === 'classroom'}
                    <ResFormClassroom {rsv}/>
                {/if}
            </form>
        </div>
    {/if}
{/if}

<Toaster/>
