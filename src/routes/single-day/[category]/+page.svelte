<script>
    import { createEventDispatcher } from 'svelte';
    import DayPool from '$lib/components/DayPool.svelte';
    import DayOpenWater from '$lib/components/DayOpenWater.svelte';
    import DayClassroom from '$lib/components/DayClassroom.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import { validReservationDate } from '$lib/ReservationTimes.js';
    import { month2idx, idx2month } from '$lib/datetimeUtils.js';
    import Modal from '$lib/components/Modal.svelte';
    import { modal, view, viewedDate } from '$lib/stores.js';

    export let data;

    $view = 'single-day';
    $: category = data.category;
    
    const dispatch = createEventDispatcher();

    function multiDayView() {
        $view = 'multi-day';
    }

    function prevDay() {
        let prev = new Date()
        prev.setDate($viewedDate.getDate() - 1);
        $viewedDate = prev;
    }
    function nextDay() {
        let next = new Date()
        next.setDate($viewedDate.getDate() + 1);
        $viewedDate = next;
    }
 
</script>

<a href="/multi-day/{category}">
    <button style="float: left" on:click={multiDayView}>&lt;&lt; Month</button>
</a>

{#if validReservationDate($viewedDate)}
<Modal show={$modal}>
    <ReservationDialog category={category} dateFn={() => $viewedDate}/>
</Modal>
{/if}

<br/>
<div class="date_nav">
    <i on:click={prevDay} on:keypress={prevDay} class="arrow left"></i>
    <h2 class="day">{idx2month[$viewedDate.getMonth()]} {$viewedDate.getDate()}</h2>
    <i on:click={nextDay} on:keypress={nextDay} class="arrow right"></i>
</div>
<div style="margin: 10px">
    {#if category == 'pool'}
        <DayPool/>
    {:else if category == 'openwater'}
        <DayOpenWater/>
    {:else if category == 'classroom'}
        <DayClassroom/>
    {/if}
</div>

<style>
    h2.day {
        display: inline;
    }
</style>
