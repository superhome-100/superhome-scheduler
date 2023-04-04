<script>
    import { startTimes } from '$lib/ReservationTimes.js';
    import { viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

    export let nResource;
    export let resourceName;
    export let category;

    $: schedule = getDaySchedule($reservations, $viewedDate, category, nResource);

</script>

<div class="header row" style="width: 100%">
    <div class="header column"/>
    {#each [...Array(nResource).keys()] as rNum}
        <div class="header column">{resourceName} {rNum+1}</div>
    {/each}
</div>
<div class="row" style="width: 100%">
    <div class="column">
        {#each startTimes(datetimeToLocalDateStr($viewedDate)) as s}
            <div class="time" style="height: 50px">{s}</div>
        {/each}
    </div>
    {#each schedule as resource}
        <div class="column">
            {#each resource as { start, nSlots, cls, tag }}
                <div class="{cls}" style="height: {50*nSlots-3}px">{tag}</div>
            {/each}
        </div>
    {/each}
</div>

