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

<div class='flex items-center justify-between'>
    <div class='dropdown h-8 mb-4'>
        <label tabindex='0' class='btn btn-fsh-dropdown'>{category}</label>
        <ul tabindex='0' class='dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit'>
            {#each ['pool', 'openwater', 'classroom'] as cat}
                {#if cat !== category}
                    <li><a class='text-xl active:bg-gray-300' href='/single-day/{cat}'>{cat}</a></li>
                {/if}
            {/each}
        </ul>
    </div>
    <div class='inline-flex items-center justify-between'>
        <span on:click={prevDay} on:keypress={prevDay} class='cursor-pointer'>
            <Chevron direction='left' svgClass='h-8 w-8'/>
        </span>
        <span on:click={nextDay} on:keypress={nextDay} class='cursor-pointer'>
            <Chevron direction='right' svgClass='h-8 w-8'/>
        </span>
        <span class='text-2xl ml-2'>
            {idx2month[$viewedDate.getMonth()]} {$viewedDate.getDate()}
        </span> 
    </div>
   <span class='mr-2'>
       <Modal><ReservationDialog {category} dateFn={()=>$viewedDate}/></Modal>
    </span>
</div>
<br/>
<div>
    <a class='inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 pb-1.5 pt-2 hover:text-white hover:bg-gray-700' href="/multi-day/{category}">
        <span><Chevron direction='left'/></span>
        <span class='text-xl pb-1'>month view</span>
    </a>
</div>
<br/>
<div class='{category} single-day'>
    <Modal>
        {#if category === 'pool'}
            <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
        {:else if category === 'classroom'}
            <DayHourly category={category} nResource={nResource()} resourceName={resourceName()}/>
        {:else if category == 'openwater'}
            <DayOpenWater/>
        {/if}
    </Modal>
</div>
