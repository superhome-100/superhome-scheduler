<script>
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    export let rsv = null;
    export let disabled = false;
    export let category;
    export let date;
    export let resType = null;

    let chosenStart = rsv == null ? startTimes()[0] : rsv.startTime;
    let chosenEnd = rsv == null ? endTimes()[0] : rsv.endTime;
    let autoOrCourse = rsv == null ? (resType == null ? 'autonomous' : resType) : rsv.resType;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;

    $canSubmit = true;

    let noModify = rsv != null;

</script>

<ResFormGeneric date={date} bind:category={category} rsv={rsv}>
    <div slot="categoryLabels">
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
            disabled={disabled || noModify} 
            bind:value={chosenStart} name="startTime"
        >
            {#each startTimes() as t}
                <option value={t}>{t}</option>
            {/each}
        </select></div>
        <div><select id="formEnd" disabled={disabled || noModify} name="endTime" value={chosenEnd}>
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
            <option value='course'>Course</option>
        </select></div>
        {#if autoOrCourse === 'course'}
            <div><select disabled={disabled} value={numStudents} name="numStudents">
                {#each [...Array(10).keys()] as n}
                    <option value={n+1}>{n+1}</option>
                {/each}
            </select></div>
        {/if}
    </div>
</ResFormGeneric>
 
