<script>
    import { canSubmit, user, users } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import BuddyMatch from '$lib/components/BuddyMatch.svelte';

    export let rsv = null;
    export let date;
    export let category;
    export let disabled = false;

    let comments = rsv == null ? null : rsv.comments;
    let noModify = rsv != null;
    date = rsv == null ? datetimeToLocalDateStr(date) : rsv.date;
    category = rsv == null ? category : rsv.category;

    const initBF = () => {
        let buddyFields = [];
        if (rsv != null) {
            for (let i=0; i < rsv.buddies.name.length; i++) {
                buddyFields.push({
                    'name': rsv.buddies.name[i],
                    'userId': rsv.buddies.id[i],
                    'id': i,
                    'matches': []
                });
            }
        }
        return buddyFields;
    };

    $: buddyFields = initBF();

    $: currentBF = { name: '', matches: [] };

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
    
    function matchUser() {
        let currentBuddies = buddyFields.map((bf) => bf.name);
        currentBF.matches = [];
        if (currentBF.name.length > 0) {
            let buddyName = currentBF.name.toLowerCase();
            for (let record of $users) {
                if (record.id != $user.id && !currentBuddies.includes(record.name)) {
                    let rec = record.name.slice(0, buddyName.length).toLowerCase(); 
                    if (buddyName === rec) {
                        currentBF.matches.push(record);
                    }
                }
            }
        }
        buddyFields = [...buddyFields];
    }
    
    const focus = (el) => el.focus();

    $: if (!currentBF.name) {
        currentBF.matches = [];
        hiLiteIndex = null;
    }
    
    const setInputVal = (match) => {
        currentBF.name = match.name;
        currentBF.userId = match.id;
        currentBF.matches = [];
        buddyFields = [...buddyFields];
        hiLiteIndex = null;
        document.querySelector('#buddy' + currentBF.id + '-input').focus();
    }
    
    let hiLiteIndex = null;
  
    const navigateList = (e) => {
        if (currentBF && currentBF.matches.length > 0) {
            if (e.key === "ArrowDown" && hiLiteIndex <= currentBF.matches.length-1) {
                hiLiteIndex === null ? hiLiteIndex = 0 : hiLiteIndex += 1
            } else if (e.key === "ArrowUp" && hiLiteIndex !== null) {
                hiLiteIndex === 0 ? hiLiteIndex = currentBF.matches.length-1 : hiLiteIndex -= 1
            } else if (e.key === "Enter") {
                e.preventDefault();
                setInputVal(currentBF.matches[hiLiteIndex]);
            } else {
                return;
            }
        }
    }

</script>

<svelte:window on:keydown={navigateList} />

<div class="row">
    <div class="column labels">
        <div><label for="formDate">Date</label></div>
        <div><label for="formCategory">Category</label></div>
        <slot name="categoryLabels"/>
        <div><label for="formComments">Comments</label></div>
        <div><label>Add buddy
                <button 
                    class="buddy" 
                    type="button" 
                    on:click={addBuddyField}
                    disabled={disabled}
                    tabindex="1"
                >+</button>
        </label></div>
    </div>

    <div class="column inputs">
        <div><input type="hidden" name="user" value={$user.id}></div>
        <div><input 
            type="date" 
            name="date" 
            id="formDate"
            min={minValidDateStr()} 
            value={date}
            disabled={disabled || noModify}
        ></div>
        <div><select 
                name="category" 
                id="formCategory" 
                bind:value={category}
                disabled={disabled || noModify}
            >
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
            disabled={disabled || noModify}
        ></div>
        {#each buddyFields as bf (bf.id)}
            <div class="autocomplete">
                <div><input 
                    id={"buddy" + bf.id + "-input"}
                    type="text" 
                    autocomplete="off"
                    name="buddy{bf.id}" 
                    bind:value={bf.name} 
                    on:input={matchUser}
                    on:focus={() => currentBF = bf}
                    use:focus
                    disabled={disabled}
                ></div>
                <input type="hidden" value={bf.userId} name="buddy{bf.id}_id">
                <button 
                    class="buddy" 
                    type="button" 
                    on:click={removeBuddyField(bf)}
                    disabled={disabled}
                >x</button> 
            </div>
            {#if bf.matches.length > 0}
                <ul id="autocomplete-items-list">
                    {#each bf.matches as m, i}
                        <BuddyMatch 
                            itemLabel={m.name} 
                            highlighted={i === hiLiteIndex} 
                            on:click={() => setInputVal(m)}
                        /> 
                    {/each}
                </ul>
            {/if}
        {/each}
    </div>
</div>

<input type="hidden" name="numBuddies" value={buddyFields.length}>
<div class="submitButton">
    <button type="submit" tabindex="2" disabled={!$canSubmit || disabled}>Submit</button>
</div>

