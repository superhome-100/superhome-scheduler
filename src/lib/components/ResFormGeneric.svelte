<script>
    import { canSubmit, user, users } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

    export let rsv = null;
    export let date;
    export let category;

    let comments = rsv == null ? null : rsv.comments;
    
    $: buddyFields = [];

    const addBuddyField = () => {
        buddyFields = [...buddyFields, { name: '', matches: [], id: buddyFields.length }];
    }

    const removeBuddyField = (bf) => {
        for (let i=0; i < buddyFields.length; i++) {
            if (bf.id === buddyFields[i].id) {
                buddyFields.splice(i,1);
                buddyFields = [...buddyFields];
                break;
            }
        }
    }
    
    function matchUser(bf) {
        bf.matches = [];
        if (bf.name.length > 0) {
            let buddyName = bf.name.toLowerCase();
            for (let record of $users) {
                let rec = record.name.slice(0, buddyName.length).toLowerCase(); 
                if (buddyName === rec) {
                    bf.matches.push(record);
                }
            }
        }
        buddyFields = [...buddyFields];
    }

    function selectBuddy(bf, match) {
        bf.name = match.name;
        bf['userId'] = match.id;
        bf.matches = [];
        buddyFields = [...buddyFields];
    }
    
    const focus = (el) => el.focus();

    function handleKeydown(event) {
        console.log(event.key + ' ' + event.code);

    }

</script>

<div class="row">
    <div class="column labels">
        <div><label for="formDate">Date</label></div>
        <div><label for="formCategory">Category</label></div>
        <slot name="categoryLabels"/>
        <div><label for="formComments">Comments</label></div>
        <div><label>Add buddy
                <button class="buddy" type="button" on:click={addBuddyField}>+</button>
        </label></div>
    </div>

    <div class="column inputs">
        <div><input type="hidden" name="user" value={$user.id}></div>
        <div><input 
            type="date" 
            name="date" 
            id="formDate"
            min={minValidDateStr()} 
            value={datetimeToLocalDateStr(date)}
        ></div>
        <div><select name="category" id="formCategory" bind:value={category}>
            <option value="pool">Pool</option>
            <option value="openwater">Open Water</option>
            <option value="classroom">Classroom</option>
        </select></div>
        <slot name="categoryInputs"/> 
        <div><input 
            id="formComments"
            type="text" 
            name="comments" 
            value={comments}
        ></div>
        {#each buddyFields as bf (bf.id)}
            <div><input 
                    type="text" 
                    autocomplete="off"
                    name="buddy{bf.id}" 
                    bind:value={bf.name} 
                    on:input={matchUser(bf)}
                    on:keydown={handleKeydown}
                    use:focus
                >
                <input type="hidden" value={bf.userId} name="buddy{bf.id}_id">
                <button class="buddy" type="button" on:click={removeBuddyField(bf)}>x</button> 
            </div>
            {#each bf.matches as m}
                <div 
                    class="buddy autofill" 
                    on:click={selectBuddy(bf, m)}
                    on:keypress={selectBuddy(bf, m)}
                >{m.name}</div>
            {/each}
        {/each}
    </div>
</div>

<input type="hidden" name="numBuddies" value={buddyFields.length}>
<div class="submitButton">
    <button type="submit" disabled={!$canSubmit}>Submit</button>
</div>

