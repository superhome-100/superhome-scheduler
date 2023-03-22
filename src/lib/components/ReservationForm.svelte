<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, users, reservations } from '$lib/stores.js';
    import { minValidDateStr, beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { augmentRsv } from '$lib/utils.js';

    export let category = 'openwater';
    export let date;
    export let hasForm = false;

    const { close } = getContext('simple-modal');

    const submitReservation = async ({ form, data, action, cancel }) => {
        let rsv = Object.fromEntries(data);
        if (!beforeResCutoff(rsv.date)) {
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

    $: buddyFields = [];

    const addBuddyField = () => {
        buddyFields = [...buddyFields, { name: '', matches: [], id: buddyFields.length }];
    }

    const removeBuddyField = (bf) => {
        for (let i=0; i < buddyFields.length; i++) {
            if (bf.id === buddyFields[i].id) {
                buddyFields.splice(i,1);
                buddyFields = [...buddyFields];
                break;
            }
        }
    }
    
    function matchUser(bf) {
        bf.matches = [];
        if (bf.name.length > 0) {
            let buddyName = bf.name.toLowerCase();
            for (let record of $users) {
                let rec = record.name.slice(0, buddyName.length).toLowerCase(); 
                if (buddyName === rec) {
                    bf.matches.push(record);
                }
            }
        }
        buddyFields = [...buddyFields];
    }

    function selectBuddy(bf, match) {
        bf.name = match.name;
        bf['userId'] = match.id;
        bf.matches = [];
        buddyFields = [...buddyFields];
    }

</script>

{#if hasForm}
    <div class="submitForm">
        <h2>reservation request</h2>
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
                <ResFormPool/>
            {:else if category === 'openwater'}
                <ResFormOpenWater/>
            {:else if category === 'classroom'}
                <ResFormClassroom/>
            {/if} 
            <label>Add buddies
                <button class="buddy" type="button" on:click={addBuddyField}>+</button>
            </label>
            {#each buddyFields as bf (bf.id)}
                <div><label>{bf.id+1}.
                        <input 
                            type="text" 
                            autocomplete="off"
                            name="buddy{bf.id}" 
                            bind:value={bf.name} 
                            on:input={matchUser(bf)}
                        >
                        <input type="hidden" value={bf.userId} name="buddy{bf.id}_id">
                    <button class="buddy" type="button" on:click={removeBuddyField(bf)}>x</button>
                    {#each bf.matches as m}
                        <div class="buddy autofill" on:click={selectBuddy(bf, m)}>{m.name}</div>
                    {/each}
                </label></div>
            {/each}
            <input type="hidden" name="numBuddies" value={buddyFields.length}>
            <div class="submitButton">
                <button type="submit" disabled={!$canSubmit}>Submit</button>
            </div>
        </form>
    </div>
{/if}

<Toaster/>
