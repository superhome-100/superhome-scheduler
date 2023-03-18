<script>
    import { canSubmit } from '$lib/stores.js';

    let autoOrCourse;
    let maxDepth = null;

    function checkSubmit() {
        $canSubmit = maxDepth > 0;
    }
    checkSubmit();

</script>

<div> 
    <label>
        Time
        <select name="owTime">
            <option value='AM'>AM</option>
            <option value='PM'>PM</option>
        </select>
    </label>
</div>
<div>
    <label>
        Type
        <select bind:value={autoOrCourse} name="resType">
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course</option>
        </select>
    </label>
</div>
{#if autoOrCourse == 'course'}
<div>
    <label>
        # Students
        <select name="numStudents">
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
            on:input={checkSubmit}
            name="maxDepth"
        >
    </label>
</div>
<div>
    <label>
        Comments
        <input type="text" name="comments" size="30">
    </label>
</div>

