<script>
    import { canSubmit } from '$lib/stores.js';

    export let rsv = null;
    export let disabled = false;

    let autoOrCourse = rsv == null ? 'autonomous' : rsv.resType;
    let maxDepth = rsv == null || rsv.maxDepth == null ? null : rsv.maxDepth;
    let owTime = rsv == null ? 'AM' : rsv.owTime;
    let comments = rsv == null ? null : rsv.comments;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;

    function checkSubmit() {
        $canSubmit = maxDepth > 0;
    }
    checkSubmit();

</script>

<div> 
    <label>
        Time
        <select disabled={disabled} name="owTime" value={owTime}>
            <option value='AM'>AM</option>
            <option value='PM'>PM</option>
        </select>
    </label>
</div>
<div>
    <label>
        Type
        <select disabled={disabled} bind:value={autoOrCourse} name="resType">
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course</option>
        </select>
    </label>
</div>
{#if autoOrCourse == 'course'}
<div>
    <label>
        # Students
        <select disabled={disabled} name="numStudents" value={numStudents}>
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
            disabled={disabled}
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
        <input disabled={disabled} type="text" name="comments" size="30" value={comments}>
    </label>
</div>

