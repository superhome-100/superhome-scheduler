<script>
    import { canSubmit } from './stores.js';


    let am_or_pm;
    let buoy='any';
    let maxDepth = null;
    let instructor = false;
    let nStudents=1;
    let comments = '';

    export const data = () => ({
        time: am_or_pm,
        buoy: buoy,
        maxDepth: maxDepth,
        instructor: instructor,
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
        <select bind:value={am_or_pm} name="am_or_pm" id="am_or_pm">
            <option value='AM'>AM</option>
            <option value='PM'>PM</option>
        </select>
    </label>
</div>
<div>
    <label>
        Buoy
        <select bind:value={buoy} name="buoy" id="buoy">
            {#each ['any', 'A', 'B', 'C', 'D'] as b}
                <option value={b}>{b}</option>
            {/each}
        </select>
    </label>
</div>
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
        Instructor
        <input type="checkbox" bind:checked={instructor} name="instructor" id="instructor">
    </label>
</div>
<div>
    <label>
        # Students
        <select bind:value={nStudents} name="nStudents" id="nStudents" disabled={!instructor}>
            {#each [1,2,3,4,5,6,7,8,9,10] as n}
                <option value={n}>{n}</option>
            {/each}
        </select>
    </label>
</div>
<div>
    <label>
        Comments
        <input type="text" name="comments" id="comments" size="30" bind:value={comments}>
    </label>
</div>

