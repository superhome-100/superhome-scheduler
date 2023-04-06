<script>
    import { goto } from '$app/navigation';
    import DayHourly from '$lib/components/DayHourly.svelte';
    import DayOpenWater from '$lib/components/DayOpenWater.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
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

<Modal><ReservationDialog category={category} dateFn={resDate}/></Modal>

<div class="single-day menu row">
    <a href="/multi-day/{category}">
            <button class="month-view" on:click={multiDayView}>Month View</button>
    </a>
    <div class="dateNav">
        <i on:click={prevDay} on:keypress={prevDay} class="arrow left"></i>
        <i on:click={nextDay} on:keypress={nextDay} class="arrow right"></i>
        <h2 style="display: inline">{idx2month[$viewedDate.getMonth()]}</h2>
        <h2 style="display: inline">{$viewedDate.getDate()}</h2>
    </div>
</div>

<div class='{category} single-day row'>
    {#if category === 'pool'}
        <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
    {:else if category === 'classroom'}
        <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
    {:else if category == 'openwater'}
        <DayOpenWater/>
    {/if}
</div>
