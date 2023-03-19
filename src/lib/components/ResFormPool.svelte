<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    export let rsv = null;
    let chosenStart = rsv == null ? startTimes()[0] : rsv.startTime;
    let chosenEnd = rsv == null ? endTimes()[0] : rsv.endTime;
    let autoOrCourse = rsv == null ? 'autonomous' : rsv.resType;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
    let comments = rsv == null ? null : rsv.comments;

    $canSubmit = true;
</script>

<div><label>
    Start Time
    <select bind:value={chosenStart} name="startTime">
        {#each startTimes() as t}
            <option value={t}>{t}</option>
        {/each}
    </select>
</label></div>
<div><label>
    End Time
    <select name="endTime" value={chosenEnd}>
        {#each endTimes() as t}
            {#if timeStrToMin(chosenStart) < timeStrToMin(t)}
                <option value={t}>{t}</option>
            {/if}
        {/each}
    </select>
</label></div>
<div><label>
    Type
    <select bind:value={autoOrCourse} name="resType">
        <option value='autonomous'>Autonomous</option>
        <option value='course'>Course</option>
    </select>
</label></div>
{#if autoOrCourse == 'course'}
    <div><label>
        # Students
        <select value={numStudents} name="numStudents">
            {#each [...Array(10).keys()] as n}
                <option value={n+1}>{n+1}</option>
            {/each}
        </select>
    </label></div>
{/if}
<div><label>
    Comments
    <input type="text" name="comments" value={comments}>
</label></div>


