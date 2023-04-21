<script>
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { canSubmit, buoys } from '$lib/stores.js';
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';

    export let rsv = null;
    export let date;
    export let dateFn = null;
    export let category;
    export let viewOnly = false;
    export let restrictModify = false;

    let disabled = viewOnly || restrictModify;

    date = rsv == null 
        ? date == null 
            ? dateFn() 
            : datetimeToLocalDateStr(new Date(date))
        : rsv.date;
    
    let autoOrCourse = rsv == null ? 'autonomous' : rsv.resType;
    let maxDepth = rsv == null || rsv.maxDepth == null ? null : rsv.maxDepth;
    let owTime = rsv == null ? 'AM' : rsv.owTime;
    let comments = rsv == null ? null : rsv.comments;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
    let pulley = rsv == null ? false : rsv.pulley;
    let extraBottomWeight = rsv == null ? false : rsv.extraBottomWeight;
    let bottomPlate = rsv == null ? false : rsv.bottomPlate;
    let largeBuoy = rsv == null ? false : rsv.largeBuoy;

    function checkSubmit() {
        $canSubmit = maxDepth > 0;
    }
    checkSubmit();

    $: showBuddyFields = autoOrCourse === 'autonomous';

</script>

<ResFormGeneric {viewOnly} {restrictModify} {showBuddyFields} bind:date={date} bind:category={category} {rsv}>
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
                <option value='course'>Course/Coaching</option>
            </select>
        </div>
        {#if autoOrCourse == 'course'}
            <div>
                <select id='formNumStudents' disabled={viewOnly} name="numStudents" value={numStudents}>
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
                id='formMaxDepth'
                class='w-14 valid:border-gray-500 required:border-red-500'
                min='1'
                max='{$buoys.reduce((maxv, b) => Math.max(maxv, b.maxDepth), 0)}'
                bind:value={maxDepth} 
                on:input={checkSubmit}
                name="maxDepth"
                required={maxDepth==undefined}
            ><span class='ml-1 text-sm dark:text-white'>meters</span>
        </div>
    </div>
    <div class='[&>span]:whitespace-nowrap [&>span]:ml-auto [&>span]:xs:mr-4 [&>span]:mr-2 [&>span]:text-sm [&>span]:dark:text-white text-center block-inline' slot='categoryOptionals'>
        <span>
            <label for='formPulley'>Pulley</label>
            <input type='hidden' name='pulley' value={pulley ? 'on' : 'off'}>
            <input 
                type='checkbox' 
                id='formPulley' 
                name='pulley' 
                checked={pulley}
                {disabled}
                tabindex='5'
            >
        </span>
        <span>
            <label for='formBottomWeight'>Extra Bottom Weight</label>
            <input type='hidden' name='extraBottomWeight' value={extraBottomWeight ? 'on' : 'off'}>
            <input 
                type='checkbox' 
                id='formBottomWeight' 
                name='extraBottomWeight'
                checked={extraBottomWeight}
                {disabled} 
                tabindex='5'
            >
        </span>
        <span>
            <label for='formBottomPlate'>Bottom Plate</label>
            <input type='hidden' name='bottomPlate' value={bottomPlate ? 'on' : 'off'}>
            <input 
                type='checkbox' 
                id='formBottomPlate' 
                name='bottomPlate'
                checked={bottomPlate}
                {disabled}
                tabindex='5'
            >
        </span>
        <span>
            <label for='formLargeBuoy'>Large Buoy</label>
            <input type='hidden' name='largeBuoy' value={largeBuoy ? 'on' : 'off'}>
            <input 
                type='checkbox' 
                id='formLargeBuoy' 
                name='largeBuoy'
                checked={largeBuoy}
                {disabled}
                tabindex='5'
            >
        </span>
    </div>
</ResFormGeneric>

