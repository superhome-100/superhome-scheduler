<script>
    import { viewedDate, reservations, buoys } from '$lib/stores.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { displayTag } from '$lib/utils.js';
    import { assignRsvsToBuoys } from '$lib/autoAssign.js';
    
    function getOpenWaterSchedule(rsvs, datetime) {
        let schedule = {};
        let today = datetimeToLocalDateStr(datetime);
        rsvs = rsvs.filter((v) => v.category === 'openwater' && v.date === today);
        
        for (let owTime of ['AM', 'PM']) {
            let result = assignRsvsToBuoys(
                $buoys, 
                rsvs.filter((rsv) => rsv.owTime === owTime)
            ); 
            schedule[owTime] = result.assignments;
        }
        return schedule;
    }

    $: schedule = getOpenWaterSchedule($reservations, $viewedDate);
    const heightUnit = 3; //rem
    const blkMgn = 0.25; // dependent on tailwind margin styling
    $: buoyHeight = $buoys.reduce((o, b) => {
        let nRes = Math.max(
            schedule.AM[b.name] ? schedule.AM[b.name].length : 0, 
            schedule.PM[b.name] ? schedule.PM[b.name].length: 0
        );
        o[b.name] = nRes*heightUnit - blkMgn;
        return o;
    }, {});

</script>

<div class='row'>
    <div class='column'>
        <div class='font-semibold'>buoy</div>
        {#each $buoys as buoy}
            {#if schedule.AM[buoy.name] != undefined || schedule.PM[buoy.name] != undefined}
                <div class='flex items-center justify-center font-semibold' style='height:{buoyHeight[buoy.name]}rem'>{buoy.name}</div>
            {/if}
        {/each}
    </div>
    <div class='column'>
        <div class='font-semibold'>AM</div>
        {#each $buoys as buoy}
            {#if schedule.AM[buoy.name] != undefined || schedule.PM[buoy.name] != undefined}
                {#if schedule.AM[buoy.name] != undefined}
                    <div 
                        class='rsv openwater text-sm h-full'
                        style='height:{buoyHeight[buoy.name]}rem'
                    >
                        {#each schedule.AM[buoy.name] as rsv}
                            <p>{displayTag(rsv)}</p>
                        {/each}
                    </div>
                {:else}
                    <div/>
                {/if}
            {/if}
        {/each}
    </div>
    <div class='column'>
        <div class='font-semibold'>PM</div>
        {#each $buoys as buoy}
            {#if schedule.AM[buoy.name] != undefined || schedule.PM[buoy.name] != undefined}
                {#if schedule.PM[buoy.name] != undefined}
                    <div class='rsv openwater text-sm h-full' style='height:{buoyHeight[buoy.name]}rem'>
                        {#each schedule.PM[buoy.name] as rsv}
                            <p>{displayTag(rsv)}</p>
                        {/each}
                    </div>
                {:else}
                    <div/>
                {/if}
            {/if}
        {/each}
    </div>
</div> 

