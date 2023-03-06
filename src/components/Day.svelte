<script>
    import { createEventDispatcher } from 'svelte';
    import DayPool from './DayPool.svelte';
    import DayOpenWater from './DayOpenWater.svelte';
    import DayClassroom from './DayClassroom.svelte';
    import ReservationDialog from './ReservationDialog.svelte';
    import { month2idx, idx2month, validReservationDate } from '../libs/ReservationTimes.js';
    import Modal from './Modal.svelte';
    import { modal } from '../libs/stores.js';

    export let date;
    export let category;

    const dispatch = createEventDispatcher();

    function back() {
        dispatch('back', {
            date: date          
        });
    }

    function prevDay() {
        let prev = new Date(date.year, month2idx[date.month], date.day-1);
        date = {year: prev.getFullYear(), month: idx2month[prev.getMonth()], day: prev.getDate()};
    }
    function nextDay() {
        let next = new Date(date.year, month2idx[date.month], date.day+1);
        date = {year: next.getFullYear(), month: idx2month[next.getMonth()], day: next.getDate()};
    }
 
</script>

<button style="float: left" on:click={back}>Back</button>

{#if validReservationDate(date)}
<Modal show={$modal}>
    <ReservationDialog category={category} date={date}/>
</Modal>
{/if}

<i on:click={prevDay} on:keypress={prevDay} class="arrow left"></i>
<h2 class="day">{date.month} {date.day}</h2>
<i on:click={nextDay} on:keypress={nextDay} class="arrow right"></i>
<div>
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
