<script>
    import { goto } from '$app/navigation';
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

<div class='[&>*]:m-auto flex items-center justify-between'>
    <div class='sm:ml-4'>
        {#each ['pool', 'openwater', 'classroom'] as cat}
            <button 
                class='category-btn' 
                on:click={()=>goto(`/multi-day/${cat}`)}
                class:selected={gCategory===cat}
            >
                {cat}
            </button>
        {/each}
    </div>
    <div class='inline-flex items-center justify-between'>
        <span on:click={prevMonth} on:keypress={prevMonth} class='cursor-pointer'>
            <Chevron direction='left' svgClass='h-6 w-6'/>
        </span>
        <span on:click={nextMonth} on:keypress={nextMonth} class='cursor-pointer'>
            <Chevron direction='right' svgClass='h-6 w-6'/>
        </span>
        <span class='text-2xl'>{idx2month[gMonth]}</span>
    </div>
    <span class=''>
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
