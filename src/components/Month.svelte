<script>
    import { createEventDispatcher } from 'svelte';
    import DayOfMonth from './DayOfMonth.svelte';
    import ReservationDialog from './ReservationDialog.svelte';
    import { idx2month, minValidDateObj } from '../lib/ReservationTimes.js';
    import Modal from './Modal.svelte';
    import { modal } from '../lib/stores.js';

    const dispatch = createEventDispatcher();

    export let category;
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    function handleSelectDay(event) {
        dispatch('selectDay', {
            date: {
                day: event.detail.date,
                month: idx2month[month],
                year: year
            }
        });
    }

    function monthArr(year, month) {
        let daysInMonth = new Date(year, month+1, 0).getDate();
        let firstDay = new Date(year, month, 1).getDay();
        let rows = Math.ceil((firstDay + daysInMonth)/7);
        let month_a = Array(rows)
            .fill()
            .map((w,w_i) => Array(7)
                .fill()
                .map(function(d,d_i) {
                    let idx = w_i*7 + d_i; 
                    if (idx >= firstDay && idx - firstDay < daysInMonth) {
                        return 1 + idx - firstDay;
                    } else {
                        return null;
                    }
                })
            );
        return month_a;
    };
 
    let month_a = monthArr(year, month);

    function prevMonth() {
        if (month == 0) {
            year = year-1;
            month =  11;
        } else {
            month = month-1;
        }
        month_a = monthArr(year, month);
    }

    function nextMonth() {
        if (month == 11) {
            year = year+1;
            month = 0;
        } else {
            month = month+1;
        }
        month_a = monthArr(year, month);
    }

    const isToday = (year, month, day) => year == today.getFullYear() && month == today.getMonth() && day == today.getDate() ? 'today' : null;

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
    <ReservationDialog category={category} date={minValidDateObj()}/>
</Modal>

<i on:click={prevMonth} on:keypress={prevMonth} class="arrow left"></i>
<h1>{idx2month[month]}</h1>
<i on:click={nextMonth} on:keypress={nextMonth} class="arrow right"></i>
<h2>{year}</h2>
<table class="{category} calendar" id="month">
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
    {#each month_a as week}
        <tr>
            {#each week as day}
                {#if day}
                    <td class="calendar_cell {category} {relativeToToday(year, month, day)}">
                        <DayOfMonth 
                            id={isToday(year,month,day)}
                            date={day} 
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

    table{
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
    }
</style>
