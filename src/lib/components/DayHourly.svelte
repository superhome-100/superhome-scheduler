<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils.js';
    import { getContext } from 'svelte';
    import ViewForms from '$lib/components/ViewForms.svelte';

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
    };

    const formatTag = (rsvs, nSlots) => {
        let names = rsvs.map((rsv)=>rsv.user.name);
        let fmt = [];
        while (names.length > 0 && fmt.length < nSlots) {
            fmt.push(names.splice(0,1));
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
                {#each schedule[i] as { start, nSlots, cls, tag, data }}
                    <div 
                        class='{cls} {category} text-sm cursor-pointer hover:font-semibold' 
                        style="height: {rowHeight*(nSlots/slotDiv) - (cls === 'rsv' ? blkMgn : 0)}rem"
                        on:click={cls === 'rsv' ? showViewRsvs(data) : ()=>{}}
                    >
                        {#each formatTag(data, nSlots) as line}
                            <div>{line}</div>
                        {/each}
                    </div>
                {/each}
            {/if}
        </div>
    {/each}
</div>

