<script>
    import { startTimes, endTimes, timeStrToMin } from '$lib/ReservationTimes.js';
    import { canSubmit } from '$lib/stores.js';

    $canSubmit = true;

    let chosenStart = startTimes[0];
    let chosenEnd;
    let nStudents=1;
    let comments='';

    export const data = () => ({
        start: chosenStart,
        end: chosenEnd,
        nStudents: nStudents,
        comments: comments
    });

</script>

<div> 
    <label>
        Start Time
        <select bind:value={chosenStart} name="start_time">
            {#each startTimes as t}
                <option value={t}>{t}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        End Time
        <select bind:value={chosenEnd} name="end_time">
            {#each endTimes as t}
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
        <select bind:value={nStudents} name="nStudents">
            {#each [1,2,3,4,5,6,7,8,9,10] as n}
                <option value={n}>{n}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        Comments
        <input type="text" bind:value={comments}>
    </label>
</div>


