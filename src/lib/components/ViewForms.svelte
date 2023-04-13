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
    import { augmentRsv, removeRsv, validateBuddies, updateReservationFormData } from '$lib/utils.js';

    export let hasForm = false;
    export let rsvs;

    const { close } = getContext('simple-modal');

</script>

{#if hasForm}
    <div class='mb-4'>
        {#each rsvs as rsv}
            <div class='text-center text-xl font-semibold my-4'>
                {rsv.user.name}
            </div>       
            {#if rsv.category === 'pool'}
                <ResFormPool viewOnly disabled {rsv}/>
            {:else if rsv.category === 'openwater'}
                <ResFormOpenWater viewOnly disabled {rsv}/>
            {:else if rsv.category === 'classroom'}
                <ResFormClassroom viewOnly disabled {rsv}/>
            {/if}
        {/each}
    </div>
{/if}

<Toaster/>
