<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import { user, users, reservations } from '$lib/stores.js';
    import { beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { toast, Toaster } from 'svelte-french-toast';
    import { augmentRsv, removeRsv } from '$lib/utils.js';

    export let rsv;
    export let hasForm = false;

    const { close } = getContext('simple-modal');
    
    const cancelReservation = async ({ form, data, action, cancel }) => {
        if (!beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category)) {
            alert(
                `The cancelation window for this reservation has expired; 
                this reservation can no longer be canceled`
            );
            cancel();
        } 

        data.append('buddies', JSON.stringify(rsv.buddies));

        let delBuddies = [];
        if (rsv.owner) {
            for (let i=0; i < rsv.buddies.length; i++) {
                if (data.get('buddy-'+i) === 'on') {
                    delBuddies.push(rsv.buddies[i]);
                }
                data.delete('buddy-'+i);
            }
        }
        data.append('delBuddies', JSON.stringify(delBuddies));

        close();

        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    for (let rsv of result.data.modified) {
                        removeRsv(rsv.id);
                        let user = $users[rsv.user.id];
                        rsv = augmentRsv(rsv, user.facebookId, user.name);
                        $reservations.push(rsv);
                    }
                    for (let rsv of result.data.canceled) {
                        removeRsv(rsv.id);
                    }
                    $reservations = [...$reservations];
                    toast.success('Reservation canceled');
                    break;
                default:
                    console.error(result);
                    toast.error('Could not cancel reservation!');
                    break;
            }
        };
    }

</script>

{#if hasForm}
    <div>
        <form 
            method="POST" 
            action="/?/cancelReservation" 
            use:enhance={cancelReservation}
        >
            <input type="hidden" name="id" value={rsv.id}>
            <input type="hidden" name="date" value={rsv.date}>
            <input type="hidden" name="category" value={rsv.category}>
            <input type="hidden" name="startTime" value={rsv.startTime}>
            <input type="hidden" name="endTime" value={rsv.endTime}>
            <input type="hidden" name="owTime" value={rsv.owTime}>
            <div class='[&>span]:inline-block my-2 text-lg dark:text-white font-semibold mr-0.5'>
                <span>Really cancel {rsv.category} reservation on</span>
                <span>{rsv.date}?</span>
            </div>
            {#if rsv.owner}
                {#each rsv.buddies as buddy, i}
                    <div>
                        <label class='dark:text-white'>Also cancel {$users[buddy].name}'s reservation
                            <input type='checkbox' name={'buddy-'+i}>
                        </label>
                    </div>
                {/each}
            {/if}
            <button class='dark:text-white dark:border-white mb-2' type="submit">Confirm</button>
        </form>
    </div>
{/if}

<Toaster/>
