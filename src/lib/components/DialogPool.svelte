<script>
    import { startTimes, endTimes, timeStrToMin } from '$lib/ReservationTimes.js';
    import { canSubmit } from '$lib/stores.js';

    $canSubmit = true;

    let chosenStart = startTimes[0];
    let chosenEnd;
    let auto_or_course;
    let nStudents = 1;
    let comments = '';

    export const data = () => ({
        start: chosenStart,
        end: chosenEnd,
        typ: auto_or_course,
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
        Type
        <select bind:value={auto_or_course} name="auto_or_course">
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course</option>
        </select>
    </label>
</div>
{#if auto_or_course == 'course'}
<div>
    <label>
        # Students
        <select bind:value={nStudents} name="nStudents">
            {#each [...Array(10).keys()] as n}
                <option value={n+1}>{n+1}</option>
            {/each}
        </select>
    </label>
</div>
{/if}
<div>
    <label>
        Comments
        <input type="text" bind:value={comments}>
    </label>
</div>



