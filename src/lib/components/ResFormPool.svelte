<script>
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
    import { startTimes, endTimes, minuteOfDay } from '$lib/ReservationTimes.js';
    import { timeStrToMin, datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    export let rsv = null;
    export let category;
    export let date;
    export let dateFn = null;
    export let resType = null;
    export let viewOnly = false;
    export let restrictModify = false;
    export let maxNumStudents = 4;

    let disabled = viewOnly || restrictModify;

    date = rsv == null 
        ? date == null 
            ? dateFn() 
            : datetimeToLocalDateStr(new Date(date)) 
        : rsv.date;

    const getStartTimes = (date) => {
        let startTs = startTimes(date);
        let today = new Date();
        if (date === datetimeToLocalDateStr(today)) {
            let now = minuteOfDay(today);
            startTs = startTs.filter((time) => timeStrToMin(time) > now);
            if (startTs.length == 0) {
                startTs = startTimes(date);
            }
        }
        return startTs;
    }
    let chosenStart = rsv == null ? getStartTimes(date)[0] : rsv.startTime;
    let chosenEnd = rsv == null ? getStartTimes(date)[1] : rsv.endTime;
    let autoOrCourse = rsv == null ? (resType == null ? 'autonomous' : resType) : rsv.resType;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
    $canSubmit = true;
    $: showBuddyFields = autoOrCourse === 'autonomous';

</script>

<ResFormGeneric {viewOnly} {restrictModify} {showBuddyFields} bind:date={date} bind:category={category} {rsv}>
    <div class='[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5' slot="categoryLabels">
        <div><label for="formStart">Start Time</label></div>
        <div><label for="formEnd">End Time</label></div>
        <div><label for="formResType">Type </label></div>
        {#if autoOrCourse === 'course'}
            <div><label for="formNumStudents"># Students</label></div>
        {/if}
    </div>

    <div slot="categoryInputs">
        <div><select 
            id="formStart" 
            {disabled} 
            bind:value={chosenStart} 
            name="startTime"
        >
            {#each getStartTimes(date) as t}
                <option value={t}>{t}</option>
            {/each}
        </select></div>
        <div><select id="formEnd" {disabled} name="endTime" value={chosenEnd}>
            {#each endTimes() as t}
                {#if timeStrToMin(chosenStart) < timeStrToMin(t)}
                    <option value={t}>{t}</option>
                {/if}
            {/each}
        </select></div>
        <div><select 
                id="formResType" 
                disabled={disabled || resType != null} 
                bind:value={autoOrCourse} 
                name="resType"
            >
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course/Coaching</option>
        </select></div>
        {#if resType != null}
            <input type="hidden" name="resType" value={resType}>
        {/if}
        {#if autoOrCourse === 'course'}
            <div><select disabled={viewOnly} value={numStudents} name="numStudents">
                {#each [...Array(restrictModify ? numStudents : maxNumStudents).keys()] as n}
                    <option value={n+1}>{n+1}</option>
                {/each}
            </select></div>
        {/if}
    </div>
</ResFormGeneric>
 
