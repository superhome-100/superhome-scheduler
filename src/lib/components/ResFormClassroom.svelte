<script>
    import { startTimes, endTimes } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { canSubmit } from '$lib/stores.js';

    $canSubmit = true;

    let chosenStart = startTimes()[0];
    let numStudents=1;

</script>

<div> 
    <label>
        Start Time
        <select bind:value={chosenStart} name="startTime">
            {#each startTimes() as t}
                <option value={t}>{t}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        End Time
        <select name="endTime">
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
        <select value={numStudents} name="numStudents">
            {#each [...Array(10).keys()] as n}
                <option value={n+1}>{n+1}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        Comments
        <input type="text" name="comments">
    </label>
</div>
<input type="hidden" name="resType" value="course">

