<script>
    import { getContext, onMount } from 'svelte';
    import DialogPool from './DialogPool.svelte';
    import DialogClassroom from './DialogClassroom.svelte';
    import DialogOpenWater from './DialogOpenWater.svelte';
    import { datetimeToDateStr, minValidDateStr } from '$lib/ReservationTimes.js';
    import { canSubmit } from '$lib/stores.js';
    
    export let category;
    export let date;
    let chosenDate;

    onMount(() => chosenDate = datetimeToDateStr(date));

	export let hasForm = false;
	export let onCancel = () => {};
	export let onOkay = () => {};

    const { close } = getContext('simple-modal');

    function _onCancel() {
		onCancel();
		close();
	}

    let data;
    function _onSubmit() {
        onOkay({...data(), date:chosenDate});
		close();
    }

    </script>

<style>
    h2 {
		font-size: 2rem;
		text-align: center;
	}
	
	.buttons {
		display: flex;
		justify-content: space-between;
	}
	
</style>

{#if hasForm}
    <h2>{category} reservation</h2>
    <label>
        Date
        <input type="date" min={minValidDateStr()} bind:value={chosenDate}>
    </label>
    {#if category == 'pool'}
        <DialogPool bind:data={data}/>
    {:else if category === 'classroom'}
        <DialogClassroom bind:data={data}/>
    {:else if category === 'openwater'}
        <DialogOpenWater bind:data={data}/>
    {/if}
{/if}

<div class="buttons">
	<button on:click={_onCancel}>
		Cancel
	</button>
	<button on:click={_onSubmit} disabled={!$canSubmit}>
	    Submit
	</button>
</div>
