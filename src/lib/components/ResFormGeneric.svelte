<script>
    import { canSubmit, user, users } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import BuddyMatch from '$lib/components/BuddyMatch.svelte';
    import PlusIcon from '$lib/components/PlusIcon.svelte';
    import DeleteIcon from '$lib/components/DeleteIcon.svelte';

    export let rsv = null;
    export let date;
    export let category;
    export let viewOnly = false;
    export let showBuddyFields = true;
    export let restrictModify = false;

    let disabled = viewOnly || restrictModify;

    let comments = rsv == null ? null : rsv.comments;
    date = rsv == null ? datetimeToLocalDateStr(date) : rsv.date;
    category = rsv == null ? category : rsv.category;

    $: maxBuddies = category === 'openwater' ? 2 
                  : category === 'pool' ? 1 
                  : category === 'classroom' ? 0 
                  : undefined;

    const initBF = () => {
        let buddyFields = [];
        if (rsv != null && rsv.buddies != null) {
            for (let i=0; i < rsv.buddies.length; i++) {
                buddyFields.push({
                    'name': $users[rsv.buddies[i]].name,
                    'userId': rsv.buddies[i],
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
                for (let i=0; i < buddyFields.length; i++) {
                    buddyFields[i].id = i;
                }
                buddyFields = [...buddyFields];
                break;
            }
        }
    }
    
    function matchUser() {
        hiLiteIndex = 0;
        let currentBuddies = buddyFields.map((bf) => bf.name);
        currentBF.matches = [];
        if (currentBF.name.length > 0) {
            let buddyName = currentBF.name.toLowerCase();
            for (let id in $users) {
                let record = $users[id];
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
        hiLiteIndex = 0;
    }
    
    const setInputVal = (match) => {
        currentBF.name = match.name;
        currentBF.userId = match.id;
        currentBF.matches = [];
        buddyFields = [...buddyFields];
        hiLiteIndex = 0;
        document.querySelector('#buddy' + currentBF.id + '-input').focus();
    }
    
    let hiLiteIndex = 0;
  
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

    const autocompUlStyle = 'relative ml-2 top-0 border border-solid border-bg-gray-300 '
                          + 'rounded text-sm';

    const bdColor = (status) => status === 'confirmed' ? 'border-[#00FF00]' : 'border-[#FFFF00]';

    const statusStyle = (status) => 'align-middle px-2 py-0 pb-1 mb-1 ml-2 w-fit '
                    + 'text-xl text-gray-500 dark:text-gray-300 '
                    + 'bg-white dark:bg-gray-500 '
                    + 'rounded-lg border ' + bdColor(status) + ' ' 
                    + 'ring-1 ring-gray-500 dark:ring-gray-300';

</script>

<svelte:window on:keydown={navigateList} />

<div class="row w-full">
    <div class="column labels text-right w-[33%]">
        {#if viewOnly}
            <div class='form-label h-8 mb-1'><label for='status'>Status</label></div>
        {/if}
        <div class='form-label h-8 mb-0.5'><label for="formDate">Date</label></div>
        <div class='form-label h-8 mb-0.5'><label for="formCategory">Category</label></div>
        <slot name="categoryLabels"/>
        
        {#if showBuddyFields}
            {#if viewOnly}
                <div class='form-label h-8 mb-0.5'><label>Buddies</label></div>
            {:else}
                <div class='form-label h-8 mb-0.5'>
                    <label>Add buddy
                        
                    </label>
                    <button 
                        class='p-0' 
                        type="button" 
                        on:click={addBuddyField}
                        disabled={disabled || buddyFields.length == maxBuddies}
                        tabindex="1"
                    >
                        <PlusIcon svgClass='h-6 w-6'/>
                    </button>
                </div>
            {/if}
            {#if buddyFields.length > 1}
                {#each buddyFields.slice(1) as bf}
                    <div class='h-8 mb-0.5'/>
                {/each}
            {/if}
        {/if}
        <div class='form-label h-8 mb-0.5'><label for="formComments">Comments</label></div>
    </div>

    <div class="column inputs text-left w-[67%]">
        {#if viewOnly}
                <div class={statusStyle(rsv.status)}>
                    {rsv.status}
                </div>
        {/if}
        <div><input type="hidden" name="user" value={$user.id}></div>
        <div><input 
            type="date" 
            name="date" 
            id="formDate"
            class='w-44'
            min={minValidDateStr(category)} 
            value={date}
            {disabled}
        ></div>
        <div>
            <select 
                name="category" 
                id="formCategory" 
                bind:value={category}
                disabled={disabled || rsv != null}
            >
                <option value="pool">Pool</option>
                <option value="openwater">Open Water</option>
                <option value="classroom">Classroom</option>
            </select>
        </div>
        <slot name="categoryInputs"/> 
        {#if showBuddyFields}
            {#if buddyFields.length == 0}
                <div class='h-8 mb-0.5'/>
            {:else}
                {#each buddyFields as bf (bf.id)}
                    <input type="hidden" value={bf.userId} name="buddy{bf.id}_id">
                    <div class="relative table">
                        <div class='table-cell align-middle'>
                            <input 
                                id={"buddy" + bf.id + "-input"}
                                type="text" 
                                class='w-48'
                                autocomplete="off"
                                name="buddy{bf.id}" 
                                bind:value={bf.name} 
                                on:input={matchUser}
                                on:focus={() => currentBF = bf}
                                use:focus
                                {disabled}
                                tabindex='2'
                            >
                            {#if !viewOnly}
                                <button 
                                    class="p-0" 
                                    style='vertical-align:inherit'
                                    type="button" 
                                    on:click={removeBuddyField(bf)}
                                    {disabled}
                                    tabindex='3'
                                ><DeleteIcon svgStyle={'h-6 w-6'}/></button> 
                            {/if}
                        </div>
                    </div>
                    {#if bf.matches.length > 0}
                        <ul class={autocompUlStyle}>
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
            {/if}
        {/if}
        <div>
            <textarea 
                id="formComments"
                name="comments" 
                class='mb-4'
                cols="17"
                bind:value={comments}
                {disabled}
            />
        </div>
    </div>
</div>

<input type="hidden" name="numBuddies" value={buddyFields.length}>

<div class='text-right p-2'>
    <button 
        type="submit" 
        class='bg-gray-100 disabled:text-gray-400 px-3 py-1'
        tabindex='4' 
        disabled={!$canSubmit}
        hidden={viewOnly}
    >Submit</button>
</div>
