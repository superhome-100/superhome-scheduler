<script>
    import { startTimes, endTimes, timeStrToMin } from './ReservationTimes.js';
    import { canSubmit } from './stores.js';

    $canSubmit = true;

    let chosenStart = startTimes[0];
    let chosenEnd;
    let chosenRoom='any';
    let nStudents=1;

    export const data = () => ({
        start: chosenStart,
        end: chosenEnd,
        room: chosenRoom,
        nStudents: nStudents
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
    <label>Room
        <select bind:value={chosenRoom} name="room" id="room">
            {#each ['any',1,2,3] as room}
                <option value={room}>{room}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        # Students
        <select bind:value={nStudents} name="nStudents" id="nStudents">
            {#each [1,2,3,4,5,6,7,8,9,10] as n}
                <option value={n}>{n}</option>
            {/each}
        </select>
    </label>
</div>



