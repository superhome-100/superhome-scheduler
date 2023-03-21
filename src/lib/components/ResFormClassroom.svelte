<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    $canSubmit = true;

    export let rsv = null;
    export let disabled = false;

    let chosenStart = rsv == null || rsv.startTime == null ? startTimes()[0] : rsv.startTime;
    let chosenEnd = rsv == null ? endTimes()[0] : rsv.endTime;
    let numStudents = rsv == null || rsv.numStudents == null ? 1 : rsv.numStudents;
    let comments = rsv == null ? null : rsv.comments; 
    let noModify = rsv != null;

</script>

<div> 
    <label>
        Start Time
        <select disabled={disabled || noModify} bind:value={chosenStart} name="startTime">
            {#each startTimes() as t}
                <option value={t}>{t}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        End Time
        <select disabled={disabled || noModify} name="endTime" value={chosenEnd}>
            {#each endTimes() as t}
                {#if timeStrToMin(chosenStart) < timeStrToMin(t)}
                    <option value={t}>{t}</option>
                {/if}
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        # Students
        <select disabled={disabled} value={numStudents} name="numStudents">
            {#each [...Array(10).keys()] as n}
                <option value={n+1}>{n+1}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        Comments
        <input disabled={disabled || noModify} type="text" name="comments" value={comments}>
    </label>
</div>
<input type="hidden" name="resType" value="course">

