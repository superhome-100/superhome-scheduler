<script>
    import { startTimes, endTimes, timeStrToMin } from './ReservationTimes.js';
    import { canSubmit } from './stores.js';

    $canSubmit = true;

    let chosenStart = startTimes[0];
    let chosenEnd;
    let chosenLane;
    let buddies = '';

    export const data = () => ({
        start: chosenStart,
        end: chosenEnd,
        lane: chosenLane,
        buddies: buddies
    });

</script>

<div> 
    <label>
        Start Time
        <select bind:value={chosenStart} name="start_time" id="start_time">
            {#each startTimes as t}
                <option value={t}>{t}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        End Time
        <select bind:value={chosenEnd} name="end_time" id="end_time">
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
        Lane
        <select bind:value={chosenLane} name="lane" id="lane">
            {#each ['any',1,2,3,4] as lane}
                <option value={lane}>{lane}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        Buddies
        <input type="text" bind:value={buddies} id="buddies">
    </label>
</div>



