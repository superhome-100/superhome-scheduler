<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { user, viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils.js';
    import { getContext } from 'svelte';
    import ViewForms from '$lib/components/ViewForms.svelte';
    import ModifyForm from '$lib/components/ModifyForm.svelte';
    import { badgeColor } from '$lib/utils.js';
    import { Settings } from '$lib/settings.js';

    export let nResource;
    export let resourceName;
    export let category;

    const { open } = getContext('simple-modal');
    
    const showViewRsvs = (rsvs) => {
        open(
            ViewForms,
            {
                rsvs: rsvs, 
                hasForm: true,
            }
        );
    };

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
    
    const displayTimes = (date) => {
        let dateStr = datetimeToLocalDateStr(date);
        let st = startTimes(dateStr);
        let et = endTimes(dateStr);
        let hrs = [];
        for (let i=0; i<st.length; i++) {
            if (i % slotDiv == 0) {
                hrs.push(st[i]);
            }
        }
        hrs.push(et[et.length-1]);
        return hrs;
    };

    const formatTag = (rsvs, nSlots) => {
        let names = rsvs.map((rsv) => {
            return rsv.resType === 'course' 
                ? rsv.user.name + ' +' + rsv.numStudents 
                : rsv.user.name
        });
        let fmt = [];
        while (names.length > 0 && fmt.length < nSlots) {
            for (name of names.splice(0,1)[0].split(' ')) {
                fmt.push(name);
            }
            if (names.length > 0) {
                fmt.push('and');
            }
        }
        if (names.length > 0) {
            fmt.push(names.join(' and '));
        }
        return fmt;
    };

</script>

{#if Settings('openForBusiness', datetimeToLocalDateStr($viewedDate)) === false}
    <div class='font-semibold text-3xl text-center'>Closed</div>
{:else}
    <div class="row text-xs xs:text-base">
        <div class="column w-[12%] m-0 text-center">
            <div style='height: 1lh'/>
            {#each displayTimes($viewedDate) as t}
                <div class='font-semibold' style='height: {rowHeight}rem'>{t}</div>
            {/each}
        </div>
        {#each [...Array(nResource).keys()] as i}
            <div  
                class="column text-center" 
                style='width: {88/nResource}%'
            >
                <div class='font-semibold'>{resourceName} {i+1}</div>
                {#if schedule[i]}
                    <div style='height: 0.5rem'/>
                    {#each schedule[i] as { nSlots, cls, tag, data }}
                        {#if cls === 'rsv'}
                            <div class='indicator w-full'>
                                <span class='rsv-indicator {badgeColor(data)}'/>
                                <div 
                                    class='{cls} {category} text-sm cursor-pointer hover:font-semibold' 
                                    style="height: {rowHeight*(nSlots/slotDiv) - (cls === 'rsv' ? blkMgn : 0)}rem"
                                    on:click={cls === 'rsv' ? showViewRsvs(data) : ()=>{}}
                                >
                                    {#each formatTag(data, nSlots) as line}
                                        <span class='mx-0.5 inline-block'>{line}</span>
                                    {/each}
                                </div>
                            </div>
                        {:else}
                            <div style="height: {rowHeight*(nSlots/slotDiv)}rem"></div>
                        {/if}
                    {/each}
                {/if}
            </div>
        {/each}
    </div>
{/if}

