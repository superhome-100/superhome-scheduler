<script>
    import { goto } from '$app/navigation';
    import DayPool from '$lib/components/DayPool.svelte';
    import DayOpenWater from '$lib/components/DayOpenWater.svelte';
    import DayClassroom from '$lib/components/DayClassroom.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import { validReservationDate, minValidDate } from '$lib/ReservationTimes.js';
    import { month2idx, idx2month } from '$lib/datetimeUtils.js';
    import Modal from '$lib/components/Modal.svelte';
    import { modal, view, viewedDate } from '$lib/stores.js';

    export let data;

    $view = 'single-day';
    $: category = data.category;
    
    function multiDayView() {
        goto('/multi-day/{category}');
    }

    function prevDay() {
        let prev = new Date($viewedDate);
        prev.setDate($viewedDate.getDate() - 1);
        $viewedDate = prev;
    }
    function nextDay() {
        let next = new Date($viewedDate);
        next.setDate($viewedDate.getDate() + 1);
        $viewedDate = next;
    }

    const resDate = () => {
        if (validReservationDate($viewedDate)) {
            return $viewedDate;
        } else {
            return minValidDate();
        }
    };

</script>

<a href="/multi-day/{category}">
    <button on:click={multiDayView}>&lt;&lt; Month</button>
</a>

<Modal show={$modal}>
    <ReservationDialog category={category} dateFn={resDate}/>
</Modal>

<br/>
<div class="dateNav">
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
