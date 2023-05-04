<script>
    import { user, viewedDate, reservations, buoys } from '$lib/stores.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { displayTag } from '$lib/utils.js';
    import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
    import { getContext } from 'svelte';
    import RsvTabs from '$lib/components/RsvTabs.svelte';
    import { badgeColor } from '$lib/utils.js';
    import { Settings } from '$lib/settings.js';
    
    const { open } = getContext('simple-modal');

    const showViewRsvs= (rsvs) => {
        open(
            RsvTabs,
            {
                rsvs, 
                hasForm: true,
                disableModify: $user.privileges === 'admin',
            }
        );
    };

    function getOpenWaterSchedule(rsvs, datetime) {
        let schedule = {};
        let today = datetimeToLocalDateStr(datetime);
        rsvs = rsvs.filter((v) => v.status != 'rejected' && v.category === 'openwater' && v.date === today);
        
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

    const rsvClass = (rsv) => {
        if (rsv.user.id === $user.id) {
            return 'border border-transparent rounded bg-lime-300 text-black';
        } else {
            return '';
        }
    }
</script>

{#if Settings.get('openForBusiness', datetimeToLocalDateStr($viewedDate)) === false}
    <div class='font-semibold text-3xl text-center'>Closed</div>
{:else}
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
                            class='rsv whitespace-nowrap overflow-hidden cursor-pointer openwater text-sm mb-1 mt-0.5'
                            style='height: {rowHeights[name].buoy}rem'
                            on:click={showViewRsvs(schedule[cur][name])}
                        >
                            {#each schedule[cur][name] as rsv, i}
                                <div class='block indicator w-full px-2'>
                                    <span class='rsv-indicator {badgeColor([rsv])}'/>
                                    <div 
                                        class='overflow-hidden {rsvClass(rsv)}'
                                        style='margin: {rowHeights[name].margins[i]}'
                                    >{displayTag(rsv)}</div>
                                </div>
                            {/each}
                        </div>
                    {:else if schedule[other][name] != undefined}
                        <div style='height: {rowHeights[name].header}rem'/>
                    {/if}
                {/each}
            </div>
        {/each}
    </div> 
{/if}
