<script>
    import { createEventDispatcher } from 'svelte';
    import { monthArr } from '$lib/utils.js';
    import DayOfMonth from '$lib/components/DayOfMonth.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import { minValidDate } from '$lib/ReservationTimes.js';
    import { idx2month } from '$lib/datetimeUtils.js';
    import { view, viewedMonth, reservations } from '$lib/stores.js';

    export let data;

    $view = 'multi-day';

    $: gCategory = data.category;
    $: gMonth = $viewedMonth.getMonth();
    $: gYear = $viewedMonth.getFullYear();
    $: gMonthArr = () => monthArr(
        gYear, 
        gMonth, 
        $reservations.filter((rsv) => rsv.category === gCategory)
    );
    
    function handleDateChange() {
        $viewedMonth = new Date(gYear, gMonth, 1); 
    }

    function prevMonth() {
        if (gMonth == 0) {
            gYear = gYear-1;
            gMonth =  11;
        } else {
            gMonth = gMonth-1;
        }
        handleDateChange();
    }

    function nextMonth() {
        if (gMonth == 11) {
            gYear = gYear+1;
            gMonth = 0;
        } else {
            gMonth = gMonth+1;
        }
        handleDateChange();
    }

    let today = new Date();

    const isToday = (date) => 
        date.getFullYear() == today.getFullYear() 
        && date.getMonth() == today.getMonth() 
        && date.getDate() == today.getDate() 
        ? 'today' : null;

</script>

<Modal><ReservationDialog category={gCategory} dateFn={minValidDate}/></Modal>

<div class="multi-day menu">
        <i on:click={prevMonth} on:keypress={prevMonth} class="arrow left"></i>
        <i on:click={nextMonth} on:keypress={nextMonth} class="arrow right"></i>
        <div style="display: inline">{idx2month[gMonth]}</div>
</div>

<div>
    <table class='calendar table-fixed border-collapse ml-1 w-full'>
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
            {#each gMonthArr() as week}
                <tr>
                    {#each week as { date, rsvs }}
                        <td class={gCategory}>
                            <DayOfMonth 
                                id={isToday(date)}
                                date={date} 
                                category={gCategory}
                                rsvs={rsvs}
                            />
                        </td>
                    {/each}
                <tr/>
            {/each}
        </tbody>
    </table>
</div>
