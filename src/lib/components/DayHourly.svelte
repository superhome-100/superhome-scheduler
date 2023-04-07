<script>
    import { startTimes } from '$lib/ReservationTimes.js';
    import { viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

    export let nResource;
    export let resourceName;
    export let category;

    $: schedule = getDaySchedule($reservations, $viewedDate, category, nResource);

    const rowHeight = 3;
    const blkMgn = 0.125; // dependent on tailwind margin styling
    
</script>

<div class="header row">
    <div class="header column"/>
    {#each [...Array(nResource).keys()] as rNum}
        <div class="header column"><b>{resourceName} {rNum+1}</b></div>
    {/each}
</div>
<div class="row">
    <div class="column">
        {#each startTimes(datetimeToLocalDateStr($viewedDate)) as s}
            <div class='font-semibold' style='height: {rowHeight}rem'>{s}</div>
        {/each}
    </div>
    {#each schedule as resource}
        <div class="column">
            {#each resource as { start, nSlots, cls, tag }}
                <div 
                    class='{cls} {category} text-sm' 
                    style="height: {rowHeight*nSlots - blkMgn}rem"
                >{tag}</div>
            {/each}
        </div>
    {/each}
</div>

