<script>
    import { user, viewedDate, reservations, buoys } from '$lib/stores.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { displayTag } from '$lib/utils.js';
    import { assignRsvsToBuoys } from '$lib/autoAssign.js';
    import { getContext } from 'svelte';
    import ViewForms from '$lib/components/ViewForms.svelte';
    import ModifyForm from '$lib/components/ModifyForm.svelte';
    import { badgeColor } from '$lib/utils.js';
    import { Settings } from '$lib/settings.js';
    
    const { open } = getContext('simple-modal');

    const showViewRsv = (rsv) => {
        if (rsv.user.id === $user.id) {
            open(
                ModifyForm,
                {
                    rsv: rsv,
                    hasForm: true,
                }
            );
        } else {
            open(
                ViewForms,
                {
                    rsvs: [rsv], 
                    hasForm: true,
                }
            );
        }
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

</script>

{#if Settings('openForBusiness', datetimeToLocalDateStr($viewedDate)) === false}
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
                            class='rsv openwater text-sm mb-1 mt-0.5'
                            style='height: {rowHeights[name].buoy}rem'
                        >
                            {#each schedule[cur][name] as rsv, i}
                                <div class='block indicator w-full'>
                                    <span class='rsv-indicator mr-0 {badgeColor([rsv])}'/>
                                    <div 
                                        class='cursor-pointer hover:font-semibold'
                                        style='margin: {rowHeights[name].margins[i]}'
                                        on:click={showViewRsv(rsv)}
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
