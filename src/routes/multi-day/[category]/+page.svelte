<script>
    import { createEventDispatcher } from 'svelte';
    import { monthArr } from '$lib/utils.js';
    import DayOfMonth from '$lib/components/DayOfMonth.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import { idx2month, minValidDateObj } from '$lib/ReservationTimes.js';
    import { modal, viewedDate, reservations } from '$lib/stores.js';

    export let data;

    $: gCategory = data.category;
    $: gMonth = $viewedDate.getMonth();
    $: gYear = $viewedDate.getFullYear();
    $: gMonthArr = monthArr(gYear, gMonth, $reservations[gCategory]);

    function handleDateChange() {
        $viewedDate = new Date(gYear, gMonth, 1); 
    }

    function handleBack(event) {
    }

    function handleSelectDay(event) {
        dispatch('selectDay', {
            date: {
                day: event.detail.date,
                month: idx2month[gMonth],
                year: gYear
            }
        });
    }


    function prevMonth() {
        if (gMonth == 0) {
            gYear = gYear-1;
            gMonth =  11;
        } else {
            gMonth = gMonth-1;
        }
        handleDateChange();
        gMonthArr = monthArr(gYear, gMonth, $reservations[gCategory]);
    }

    function nextMonth() {
        if (gMonth == 11) {
            gYear = gYear+1;
            gMonth = 0;
        } else {
            gMonth = gMonth+1;
        }
        handleDateChange();
        gMonthArr = monthArr(gYear, gMonth, $reservations[gCategory]);
    }

    let today = new Date();

    const isToday = (year, month, day) => 
        year == today.getFullYear() 
        && month == today.getMonth() 
        && day == today.getDate() 
        ? 'today' : null;

    function relativeToToday(year, month, day) {
        if (year < today.getFullYear()) {
            return 'before';
        } else if (year > today.getFullYear()) {
            return 'after';
        } else {
            if (month < today.getMonth()) {
                return 'before';
            } else if (month > today.getMonth()) {
                return 'after';
            } else {

                if (day < today.getDate()) {
                    return 'before';
                } else if (day > today.getDate()) {
                    return 'after';
                } else {
                    return 'today';
                }
            }
        }               
    }

</script>


<Modal show={$modal}>
    <ReservationDialog category={gCategory} date={minValidDateObj()}/>
</Modal>

<i on:click={prevMonth} on:keypress={prevMonth} class="arrow left"></i>
<h1>{idx2month[gMonth]}</h1>
<i on:click={nextMonth} on:keypress={nextMonth} class="arrow right"></i>
<h2>{gYear}</h2>
<table class="{gCategory} calendar" id="month">
    <thead>
        <tr>
            <th>S</th>
            <th>M</th>
            <th>T</th>
            <th>W</th>
            <th>T</th>
            <th>F</th>
            <th>S</th>
        </tr>
    </thead>
    <tbody>
        {#each gMonthArr as week}
            <tr>
                {#each week as params}
                    {#if params}
                        <td class="calendar_cell {gCategory} {relativeToToday(gYear, gMonth, params.day)}">
                            <DayOfMonth 
                                id={isToday(gYear, gMonth, params.day)}
                                date={params.day} 
                                rsv={params.rsv}
                                on:selectDay={handleSelectDay}
                            />
                        </td>
                    {:else}
                        <td/>
                    {/if}
                {/each}
            <tr/>
        {/each}
    </tbody>
</table>

<style type="text/css" media="screen">

    table {
        table-layout: fixed;
        width: 100%;
        border-collapse:collapse;
    }
    table.pool td.pool {
        border:1px solid #0000FF;
    }
    table.openwater td.openwater {
        border:1px solid #00FF00;
    }
    table.classroom td.classroom {
        border:1px solid #FFFF00;
    }
   td {
        vertical-align: top;
        text-align: center;
        width: 14%;
    }
</style>
