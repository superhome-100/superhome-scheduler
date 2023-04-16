<script>
    import { canSubmit, buoys } from '$lib/stores.js';
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';

    export let rsv = null;
    export let date;
    export let category;
    export let viewOnly = false;
    export let restrictModify = false;

    let disabled = viewOnly || restrictModify;

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

    $: showBuddyFields = autoOrCourse === 'autonomous';

</script>

<ResFormGeneric {viewOnly} {restrictModify} {showBuddyFields} {date} bind:category={category} {rsv}>
    <div class='[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5' slot="categoryLabels">
        <div><label for="formOwTime">Time</label></div>
        <div><label for="formResType">Type</label></div>
        {#if autoOrCourse === 'course'}
            <div><label for="formNumStudents"># Students</label></div>
        {/if}
        <div><label for="formMaxDepth">Max Depth</label></div>
    </div>
    <div slot="categoryInputs">
        <div>
            <select 
                id="formOwTime" 
                {disabled} 
                name="owTime" 
                value={owTime}
            >
                <option value='AM'>AM</option>
                <option value='PM'>PM</option>
            </select>
        </div>
        <div>
            <select 
                id="formResType" 
                {disabled} 
                bind:value={autoOrCourse} 
                name="resType"
            >
                <option value='autonomous'>Autonomous</option>
                <option value='course'>Course</option>
            </select>
        </div>
        {#if autoOrCourse == 'course'}
            <div>
                <select disabled={viewOnly} name="numStudents" value={numStudents}>
                    {#each [...Array(restrictModify ? numStudents : 10).keys()] as n}
                        <option value={n+1}>{n+1}</option>
                    {/each}
                </select>
            </div>
        {/if}
        <div>
            <input 
                {disabled}
                type=number 
                class='w-14 valid:border-gray-500 required:border-red-500'
                min='1'
                max='{$buoys.reduce((maxv, b) => Math.max(maxv, b.maxDepth), 0)}'
                bind:value={maxDepth} 
                on:input={checkSubmit}
                name="maxDepth"
                required={maxDepth==undefined}
            ><span class='ml-1 text-sm'>meters</span>
        </div>
    </div>
</ResFormGeneric>

