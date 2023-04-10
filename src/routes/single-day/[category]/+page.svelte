<script>
    import { goto } from '$app/navigation';
    import DayHourly from '$lib/components/DayHourly.svelte';
    import DayOpenWater from '$lib/components/DayOpenWater.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import Chevron from '$lib/components/Chevron.svelte';
    import { validReservationDate, minValidDate } from '$lib/ReservationTimes.js';
    import { month2idx, idx2month } from '$lib/datetimeUtils.js';
    import Modal from '$lib/components/Modal.svelte';
    import { view, viewedDate } from '$lib/stores.js';

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

    const nResource = () => {
        if (category === 'pool') {
            return 4;
        } else if (category === 'classroom') {
            return 3;
        }
    };

    const resourceName = () => {
        if (category === 'pool') {
            return 'lane';
        } else if (category === 'classroom') {
            return 'room';
        }
    };

</script>

<br/>
<div class="flex justify-between">
    <span class='ml-2'>
        <a href="/multi-day/{category}">
            <button class="month-view" on:click={multiDayView}>Month View</button>
        </a>
    </span>
    <span class='inline-flex items-center text-2xl md:text-3xl md:ml-2'>{category}</span>
   <span class='mr-2'>
        <Modal><ReservationDialog category={category} dateFn={resDate}/></Modal>
    </span>
</div>
<br/>
<div class='text-center'>
    <span class='inline-flex items-center mr-2' on:click={prevDay} on:keypress={prevDay}>
        <Chevron direction='left'/>
    </span>
    <span class='text-2xl'>
        {idx2month[$viewedDate.getMonth()]} {$viewedDate.getDate()}
    </span>
    <span class='inline-flex items-center ml-2' on:click={nextDay} on:keypress={nextDay}>
        <Chevron direction='right'/>
    </span>
</div>
<br/>
<div class='{category} single-day'>
    {#if category === 'pool'}
        <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
    {:else if category === 'classroom'}
        <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
    {:else if category == 'openwater'}
        <DayOpenWater/>
    {/if}
</div>
