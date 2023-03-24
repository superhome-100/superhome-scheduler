<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, reservations } from '$lib/stores.js';
    import { minValidDateStr, beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { augmentRsv, removeRsv } from '$lib/utils.js';

    export let hasForm = false;
    export let rsv;

    const { close } = getContext('simple-modal');

    const updateReservation = async ({ form, data, action, cancel }) => {
        let rsv = Object.fromEntries(data);
        if (!beforeCancelCutoff(rsv.date, rsv.startTime)) {
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
    let disabled = !beforeCancelCutoff(rsv.date, rsv.startTime);
    let prompt = disabled ? '' : 'modify';
</script>

{#if hasForm}
    <div class="submitForm">
        <h2>{prompt} {rsv.category} reservation</h2>
        <form 
            method="POST" 
            action="/?/updateReservation" 
            use:enhance={updateReservation}
        >
            <input type="hidden" name="id" value={rsv.id}>
            {#if rsv.category === 'pool'}
                <ResFormPool disabled={disabled} rsv={rsv}/>
            {:else if rsv.category === 'openwater'}
                <ResFormOpenWater disabled={disabled} rsv={rsv}/>
            {:else if rsv.category === 'classroom'}
                <ResFormClassroom disabled={disabled} rsv={rsv}/>
            {/if}
        </form>
    </div>
{/if}

<Toaster/>
