<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { user, viewedDate, reservations } from '$lib/stores.js';
    import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils.js';
    import { getContext } from 'svelte';
    import ViewForms from '$lib/components/ViewForms.svelte';
    import ModifyForm from '$lib/components/ModifyForm.svelte';
    import { badgeColor, getDaySchedule } from '$lib/utils.js';
    import { Settings } from '$lib/settings.js';

    export let resources;
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

    $: assignmentAttempt = getDaySchedule($reservations, $viewedDate, category, resources.length);

    const rowHeight = 3;
    const blkMgn = 0.1875; // dependent on tailwind margin styling

    const slotsPerHr = (date, category) => {
        let st = startTimes(date, category);
        let et = endTimes(date, category);
        let beg = st[0];
        let end = et[et.length-1];
        let totalMin = (timeStrToMin(end) - timeStrToMin(beg)) 
        let sph = 60 / (totalMin / st.length);
        return sph;
    }
    
    $: slotDiv = slotsPerHr(datetimeToLocalDateStr($viewedDate), category);
    
    const displayTimes = (date, category) => {
        let dateStr = datetimeToLocalDateStr(date);
        let st = startTimes(dateStr, category);
        let et = endTimes(dateStr, category);
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
{:else if assignmentAttempt.status === 'error'}
    <div class='font-semibold text-red-600 text-xl text-center mt-4'>Error assigning reservations!</div>
    <div class='text-sm text-center mt-2'>Please report this error to the admin</div>
{:else}
    <div class="row text-xs xs:text-base">
        <div class="column w-[12%] m-0 text-center">
            <div style='height: 1lh'/>
            {#each displayTimes($viewedDate, category) as t}
                <div class='font-semibold' style='height: {rowHeight}rem'>{t}</div>
            {/each}
        </div>
        {#each resources as resource, i}
            <div  
                class="column text-center" 
                style='width: {88/resources.length}%'
            >
                <div class='font-semibold'>{resourceName} {resource}</div>
                {#if assignmentAttempt.status === 'success'}
                    {#if assignmentAttempt.schedule[i]}
                        <div style='height: 0.5rem'/>
                        {#each assignmentAttempt.schedule[i] as { nSlots, cls, data }}
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
                {/if}
            </div>
        {/each}
    </div>
{/if}

