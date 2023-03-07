<script>
    import { canSubmit } from '../lib/stores.js';

    let auto_or_course;
    let am_or_pm;
    let maxDepth = null;
    let nStudents=1;
    let comments = '';

    export const data = () => ({
        time: am_or_pm,
        typ: auto_or_course,
        maxDepth: maxDepth,
        nStudents: nStudents,
        comments: comments
    });

    function checkSubmit() {
        $canSubmit = maxDepth > 0;
    }
    checkSubmit();

</script>

<div> 
    <label>
        Time
        <select bind:value={am_or_pm} name="am_or_pm">
            <option value='AM'>AM</option>
            <option value='PM'>PM</option>
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
        Max Depth
        <input 
            type=number 
            min=1 
            style="width:40px" 
            bind:value={maxDepth} 
            on:change={checkSubmit}
        >
    </label>
</div>
<div>
    <label>
        Comments
        <input type="text" name="comments" id="comments" size="30" bind:value={comments}>
    </label>
</div>

