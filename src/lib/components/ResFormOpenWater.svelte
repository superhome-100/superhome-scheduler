<script>
    import { canSubmit } from '$lib/stores.js';
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';

    export let rsv = null;
    export let disabled = false;
    export let date;
    export let category;

    category = rsv == null ? category : rsv.category;
    date = rsv == null ? date : rsv.date;
    let autoOrCourse = rsv == null ? 'autonomous' : rsv.resType;
    let maxDepth = rsv == null || rsv.maxDepth == null ? null : rsv.maxDepth;
    let owTime = rsv == null ? 'AM' : rsv.owTime;
    let comments = rsv == null ? null : rsv.comments;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;

    function checkSubmit() {
        $canSubmit = maxDepth > 0;
    }
    checkSubmit();

    let noModify = rsv != null;

</script>

<ResFormGeneric disabled={disabled} date={date} bind:category={category} rsv={rsv}>
    <div slot="categoryLabels">
        <div><label for="formOwTime">Time</label></div>
        <div><label for="formResType">Type</label></div>
        {#if autoOrCourse === 'course'}
            <div><label for="formNumStudents"># Students</label></div>
        {/if}
        <div><label for="formMaxDepth">Max Depth</label></div>
    </div>
    <div slot="categoryInputs">
        <div><select id="formOwTime" disabled={disabled || noModify} name="owTime" value={owTime}>
            <option value='AM'>AM</option>
            <option value='PM'>PM</option>
        </select></div>
        <div><select id="formResType" disabled={disabled} bind:value={autoOrCourse} name="resType">
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course</option>
        </select></div>
        {#if autoOrCourse == 'course'}
            <div><select disabled={disabled} name="numStudents" value={numStudents}>
                {#each [...Array(10).keys()] as n}
                    <option value={n+1}>{n+1}</option>
                {/each}
            </select></div>
        {/if}
        <div><input 
            disabled={disabled || noModify}
            type=number 
            min=1 
            style="width:40px" 
            bind:value={maxDepth} 
            on:input={checkSubmit}
            name="maxDepth"
        ></div>
    </div>
</ResFormGeneric>

