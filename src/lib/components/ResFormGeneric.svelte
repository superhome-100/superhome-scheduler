<script>
    import { canSubmit, user, users } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import BuddyMatch from '$lib/components/BuddyMatch.svelte';

    export let rsv = null;
    export let date;
    export let category;

    let comments = rsv == null ? null : rsv.comments;
    
    $: buddyFields = [];
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
        currentBF.matches = [];
        if (currentBF.name.length > 0) {
            let buddyName = currentBF.name.toLowerCase();
            for (let record of $users) {
                let rec = record.name.slice(0, buddyName.length).toLowerCase(); 
                if (buddyName === rec) {
                    currentBF.matches.push(record);
                }
            }
        }
        buddyFields = [...buddyFields];
    }
    
    const focus = (el) => el.focus();

    /* HANDLING THE INPUT */
    let searchInput; // use with bind:this to focus element
 
    $: if (!currentBF.name) {
        currentBF.matches = [];
        hiLiteIndex = null;
    }

    const clearInput = () => {
        currentBF.name = "";	
        searchInput.focus();
    }
    
    const setInputVal = (match) => {
        currentBF.name = match.name;
        currentBF.userId = match.id;
        currentBF.matches = [];
        buddyFields = [...buddyFields];
        hiLiteIndex = null;
        document.querySelector('#buddy' + currentBF.id + '-input').focus();
    }
    
    /* NAVIGATING OVER THE LIST OF COUNTRIES W HIGHLIGHTING */	
    let hiLiteIndex = null;
    $: hiLitedBuddy = currentBF.matches[hiLiteIndex]; 	
        
    const navigateList = (e) => {
        if (e.key === "ArrowDown" && hiLiteIndex <= currentBF.matches.length-1) {
            hiLiteIndex === null ? hiLiteIndex = 0 : hiLiteIndex += 1
        } else if (e.key === "ArrowUp" && hiLiteIndex !== null) {
            hiLiteIndex === 0 ? hiLiteIndex = currentBF.matches.length-1 : hiLiteIndex -= 1
        } else if (e.key === "Enter") {
            setInputVal(currentBF.matches[hiLiteIndex]);
        } else {
            return;
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
            <div class="autocomplete"><input 
                    id={"buddy" + bf.id + "-input"}
                    type="text" 
                    autocomplete="off"
                    name="buddy{bf.id}" 
                    bind:this={searchInput}
                    bind:value={bf.name} 
                    on:input={matchUser}
                    on:focus={() => currentBF = bf}
                    use:focus
                >
                <input type="hidden" value={bf.userId} name="buddy{bf.id}_id">
                <button class="buddy" type="button" on:click={removeBuddyField(bf)}>x</button> 
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
    <button type="submit" disabled={!$canSubmit}>Submit</button>
</div>

