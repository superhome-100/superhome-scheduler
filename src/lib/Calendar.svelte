<script>
    import Month from './Month.svelte';
    import Day from './Day.svelte';
    import MyReservations from './MyReservations.svelte';

    let category = null;
    let view = 'month';
    let selectedDate = null;
    
    function selectPool() {
        category = 'pool';
        if (!['month', 'day'].includes(view)) {
            view = 'month';
        }
   }
    function selectOpenWater() {
        category = 'openwater';
        if (!['month', 'day'].includes(view)) {
            view = 'month';
        }
    }
    function selectClassroom() {
        category = 'classroom';
        if (!['month', 'day'].includes(view)) {
            view = 'month';
        }
    }

    function handleSelectDay(event) {
        view = 'day';
        selectedDate = event.detail.date;
    }

    function handleBack(event) {
        view = 'month';
    }
    
    function showMyReservations() {
        view = 'myreservations';
    }

</script>

<div id="category_buttons">
    <button on:click={showMyReservations}>My Reservations</button>
    <button on:click={selectPool}>Pool</button>
    <button on:click={selectOpenWater}>Open Water</button>
    <button on:click={selectClassroom}>Classroom</button>
</div>

{#if view === 'myreservations'}
    <MyReservations/>
{:else if category != null}
    {#if view == 'month'}
        <Month on:selectDay={handleSelectDay} category={category}/>
    {:else if view == 'day'}
        <Day on:back={handleBack} date={selectedDate} category={category}/>
    {/if}
{/if}

