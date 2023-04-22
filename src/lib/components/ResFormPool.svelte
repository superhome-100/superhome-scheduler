<script>
    import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
    import { startTimes, endTimes, minuteOfDay } from '$lib/ReservationTimes.js';
    import { timeStrToMin, datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { canSubmit, user } from '$lib/stores.js';
    import { Settings } from '$lib/settings.js';

    const nLanes = () => Settings('poolLanes').length;
    const nRooms = () => Settings('classrooms').length;

    export let rsv = null;
    export let category = 'pool';
    export let date;
    export let dateFn = null;
    export let resType = null;
    export let viewOnly = false;
    export let restrictModify = false;
    export let maxNumStudents = 4;

    let disabled = viewOnly || restrictModify;

    date = rsv == null 
        ? date == null 
            ? dateFn() 
            : datetimeToLocalDateStr(new Date(date)) 
        : rsv.date;

    const getStartTimes = (date, category) => {
        let startTs = startTimes(date, category);
        let today = new Date();
        if (!disabled && date === datetimeToLocalDateStr(today)) {
            let now = minuteOfDay(today);
            startTs = startTs.filter((time) => timeStrToMin(time) > now);
            if (startTs.length == 0) {
                startTs = startTimes(date, category);
            }
        }
        return startTs;
    }
    let chosenStart = rsv == null ? getStartTimes(date, category)[0] : rsv.startTime;
    let chosenEnd = rsv == null ? getStartTimes(date, category)[1] : rsv.endTime;
    let autoOrCourse = rsv == null ? (resType == null ? 'autonomous' : resType) : rsv.resType;
    let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
    $canSubmit = true;
    $: showBuddyFields = autoOrCourse === 'autonomous';
    
    const adminView = () => $user.privileges === 'admin' && viewOnly; 

</script>

<ResFormGeneric {viewOnly} {restrictModify} {showBuddyFields} bind:date={date} bind:category={category} {rsv}>
    <div class='[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5' slot="categoryLabels">
        {#if adminView()}
            {#if category === 'pool'}
                <div><label for='formLane'>Lane</label></div>
            {:else if category === 'classroom'}
                <div><label for='formRoom'>Room</label></div>
            {/if}
        {/if}
        <div><label for="formStart">Start Time</label></div>
        <div><label for="formEnd">End Time</label></div>
        <div><label for="formResType">Type </label></div>
        {#if autoOrCourse === 'course'}
            <div><label for="formNumStudents"># Students</label></div>
        {/if}
    </div>

    <div slot="categoryInputs">
        {#if adminView()}
            {#if category === 'pool'}
                <div><select
                        id='formLane'
                        name='lane'
                        value={rsv.lane}
                    >
                        <option value={undefined}>Auto</option>
                        {#each [...Array(nLanes()).keys()] as lane}
                            <option value={lane+1}>{lane+1}</option>
                        {/each}
                    </select>
                </div>
            {:else if category === 'classroom'}
                <div><select
                        id='formRoom'
                        name='room'
                        value={rsv.room}
                    >
                        <option value={undefined}>Auto</option>
                        {#each [...Array(nRooms()).keys()] as room}
                            <option value={room+1}>{room+1}</option>
                        {/each}
                    </select>
                </div>
            {/if}
        {/if}
        <div><select 
            id="formStart" 
            {disabled} 
            bind:value={chosenStart} 
            name="startTime"
        >
            {#each getStartTimes(date, category) as t}
                <option value={t}>{t}</option>
            {/each}
        </select></div>
        <div><select id="formEnd" {disabled} name="endTime" value={chosenEnd}>
            {#each endTimes(date, category) as t}
                {#if timeStrToMin(chosenStart) < timeStrToMin(t)}
                    <option value={t}>{t}</option>
                {/if}
            {/each}
        </select></div>
        <div><select 
                id="formResType" 
                disabled={disabled || resType != null} 
                bind:value={autoOrCourse} 
                name="resType"
            >
            <option value='autonomous'>Autonomous</option>
            <option value='course'>Course/Coaching</option>
        </select></div>
        {#if resType != null}
            <input type="hidden" name="resType" value={resType}>
        {/if}
        {#if autoOrCourse === 'course'}
            <div><select disabled={viewOnly} value={numStudents} name="numStudents">
                {#each [...Array(restrictModify ? numStudents : maxNumStudents).keys()] as n}
                    <option value={n+1}>{n+1}</option>
                {/each}
            </select></div>
        {/if}
    </div>
</ResFormGeneric>
 
