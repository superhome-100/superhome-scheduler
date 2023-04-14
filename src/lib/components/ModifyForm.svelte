<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations } from '$lib/stores.js';
    import { beforeCancelCutoff, beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { 
        augmentRsv, 
        removeRsv, 
        validateBuddies, 
        updateReservationFormData, 
        convertReservationTypes 
    } from '$lib/utils.js';

    export let hasForm = false;
    export let rsv;

    const { close } = getContext('simple-modal');

    const reservationUnchanged = (formData) => {
        const isEmpty = (v) => v == null || v == '' || (Object.hasOwn(v, 'length') && v.length == 0);
        const bothEmpty = ((a,b) => isEmpty(a) && isEmpty(b));

        let submitted = convertReservationTypes(Object.fromEntries(formData));   
        for (let field in submitted) {
            if (field === 'user') { continue };
            
            let a = rsv[field];
            let b = submitted[field];

            if (bothEmpty(a,b)) { continue };

            if (field === 'buddies') {
                if (rsv.buddies == null || submitted.buddies == null) {
                    return false;
                }
                if (rsv.buddies.length != submitted.buddies.length) {
                    return false;
                }
                for (let id of rsv.buddies) {
                    if (!submitted.buddies.includes(id)) {
                        return false;
                    }
                }
            } else if (a !== b) {
                return false;
            }
        }
        return true;
    };

    const updateReservation = async ({ form, data, action, cancel }) => {
        updateReservationFormData(data);
        
        if (reservationUnchanged(data)) {
            cancel();
            close();
            return;
        }

        let result = validateBuddies(data);
        if (result.status == 'error') {
            alert(result.msg);
            cancel();
            return;
        }
        if (!beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category)) {
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
    
    let restrictModify = !beforeResCutoff(rsv.date);
    let viewOnly = rsv.category !== 'classroom'
            && !beforeCancelCutoff(rsv.date, rsv.startTime) 
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
