<script>
    import ReservationsTable from './ReservationsTable.svelte';

    let view = 'upcoming';

    function showUpcoming() {
        view = 'upcoming';
    }
    function showPast() {
        view = 'past';
    }

</script>

<br/>
<div>
<button on:click={showUpcoming}>Upcoming</button>
<button on:click={showPast}>Past</button>
</div>

{#if view === 'upcoming'}
    <ReservationsTable resType='upcoming'/>
{:else if view === 'past'}
    <ReservationsTable resType='past'/>
{/if}

