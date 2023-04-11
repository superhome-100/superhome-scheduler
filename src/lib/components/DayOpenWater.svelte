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
    
    const heightUnit = 2; //rem
    const blkMgn = 0.25; // dependent on tailwind margin styling
        
    $: rowHeights = $buoys.reduce((o, b) => {
        let nRes = Math.max(
            schedule.AM[b.name] ? schedule.AM[b.name].length : 0, 
            schedule.PM[b.name] ? schedule.PM[b.name].length: 0
        );
        o[b.name] = {  
            header: nRes*heightUnit,
            buoy: nRes*heightUnit - blkMgn,
            margins: [...Array(nRes).keys()].map((idx) => {
                const outer = (nRes*heightUnit - blkMgn - 1.25*nRes) / 2;
                let top, btm;
                if (idx == 0) {
                    top = outer;
                    btm = 0;
                } else if (idx  == nRes-1) {
                    top = 0;
                    btm = outer;
                } else {
                    top = 0;
                    btm = 0;
                }
                return top + 'rem 0 ' + btm + 'rem 0'
            })
        }
        return o;
    }, {});


</script>

<div class='row'>
    <div class='column text-center w-[10%]'>
        <div class='font-semibold'>buoy</div>
        {#each $buoys as { name }}
            {#if schedule.AM[name] != undefined || schedule.PM[name] != undefined}
                <div 
                    class='flex items-center justify-center font-semibold' 
                    style='height: {rowHeights[name].header}rem'
                >{name}</div>
            {/if}
        {/each}
    </div>
    {#each [{cur:'AM', other:'PM'}, {cur:'PM', other:'AM'}] as {cur, other}}
        <div class='column text-center w-[45%]'>
            <div class='font-semibold'>{cur}</div>
            {#each $buoys as { name }}
                {#if schedule[cur][name] != undefined}
                    <div 
                        class='rsv openwater text-sm'
                        style='height: {rowHeights[name].buoy}rem'
                    >
                        {#each schedule[cur][name] as rsv, i}
                            <div 
                                class='overflow-hidden whitespace-nowrap'
                                style='margin: {rowHeights[name].margins[i]}'
                            >{displayTag(rsv)}</div>
                        {/each}
                    </div>
                {:else if schedule[other][name] != undefined}
                    <div style='height: {rowHeights[name].header}rem'/>
                {/if}
            {/each}
        </div>
    {/each}
</div> 

