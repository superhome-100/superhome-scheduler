<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    let chosenStart = startTimes()[0];
    let autoOrCourse = 'autonomous';
    let numStudents = 1;

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
    <select name="endTime">
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
    <input type="text" name="comments">
</label></div>


