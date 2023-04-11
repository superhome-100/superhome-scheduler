<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils.js';

    export let nResource;
    export let resourceName;
    export let category;

    $: schedule = getDaySchedule($reservations, $viewedDate, category, nResource);

    const rowHeight = 3;
    const blkMgn = 0.25; // dependent on tailwind margin styling

    const slotsPerHr = () => {
        let date = datetimeToLocalDateStr($viewedDate);
        let st = startTimes(date);
        let et = endTimes(date);
        let beg = st[0];
        let end = et[et.length-1];
        let totalMin = (timeStrToMin(end) - timeStrToMin(beg)) 
        let sph = 60 / (totalMin / st.length);
        return sph;
    }
    
    $: slotDiv = slotsPerHr(startTimes(datetimeToLocalDateStr($viewedDate)));
    
    const displayTimes = () => {
        let date = datetimeToLocalDateStr($viewedDate);
        let st = startTimes(date);
        let et = endTimes(date);
        let hrs = [];
        for (let i=0; i<st.length; i++) {
            if (i % slotDiv == 0) {
                hrs.push(st[i]);
            }
        }
        hrs.push(et[et.length-1]);
        return hrs;
    }

</script>

<div class="row">
    <div class="column w-[12%] m-0 text-center">
        <div style='height: 1lh'/>
        {#each displayTimes() as t}
            <div class='font-semibold' style='height: {rowHeight}rem'>{t}</div>
        {/each}
    </div>
    {#each [...Array(nResource).keys()] as i}
        <div class="column text-center" style='width: {88/nResource}%'>
            <div class='font-semibold'>{resourceName} {i+1}</div>
            {#if i < schedule.length}
                <div style='height: 0.5rem'/>
                {#each schedule[i] as { start, nSlots, cls, tag }}
                    <div 
                        class='{cls} {category} text-sm' 
                        style="height: {rowHeight*(nSlots/slotDiv) - (cls === 'rsv' ? blkMgn : 0)}rem"
                    >{tag}</div>
                {/each}
            {/if}
        </div>
    {/each}
</div>

