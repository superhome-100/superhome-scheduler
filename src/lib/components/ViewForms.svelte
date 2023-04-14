<script>
    import { getContext } from 'svelte';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';

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
                <ResFormPool viewOnly {rsv}/>
            {:else if rsv.category === 'openwater'}
                <ResFormOpenWater viewOnly {rsv}/>
            {:else if rsv.category === 'classroom'}
                <ResFormClassroom viewOnly {rsv}/>
            {/if}
        {/each}
    </div>
{/if}

