<script>
    import { createEventDispatcher } from 'svelte';
    import { monthArr } from '$lib/utils.js';
    import DayOfMonth from '$lib/components/DayOfMonth.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import Chevron from '$lib/components/Chevron.svelte';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
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

    const catStyle = (cat) => { return (cat === 'pool')
        ? 'border-pool-bg-to' : (cat === 'openwater')
        ? 'border-openwater-bg-to' : (cat === 'classroom')
        ? 'border-classroom-bg-to' : undefined;
    };

</script>

<div class="flex items-center justify-between">
    <div class='dropdown h-8 mb-4'>
        <label tabindex='0' class='btn btn-fsh-dropdown'>{gCategory}</label>
        <ul tabindex='0' class='dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit'>
            {#each ['pool', 'openwater', 'classroom'] as cat}
                {#if cat !== gCategory}
                    <li><a class='text-xl active:bg-gray-300' href='/multi-day/{cat}'>{cat}</a></li>
                {/if}
            {/each}
        </ul>
    </div>
    <div class='inline-flex items-center justify-between'>
        <span on:click={prevMonth} on:keypress={prevMonth} class='cursor-pointer'>
            <Chevron direction='left' svgClass='h-8 w-8'/>
        </span>
        <span on:click={nextMonth} on:keypress={nextMonth} class='cursor-pointer'>
            <Chevron direction='right' svgClass='h-8 w-8'/>
        </span>
        <span class='text-2xl ml-2'>{idx2month[gMonth]}</span>
    </div>
    <span class='mr-2'>
        <Modal><ReservationDialog category={gCategory} dateFn={minValidDateStr}/></Modal>
    </span>
</div>
<div>
    <table class='calendar table-fixed border-collapse w-full'>
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
                        <td class='{catStyle(gCategory)} align-top h-20 xs:h-24 border border-solid'>
                            <DayOfMonth 
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
