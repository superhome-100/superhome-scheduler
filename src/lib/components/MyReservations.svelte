<script>
    import { userId } from '$lib/stores.js';
    import ReservationsTable from './ReservationsTable.svelte';
    
    export let name;
    export let reservations;

    let view = 'upcoming';

    async function fetchReservations(view) {
        const response = await fetch(`/${name}`, {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: $userId, view: view })
        });
        const rsvs = await response.json();
        return rsvs;
    }

    let promise = reservations;

    function update() {
        promise = fetchReservations(view);
    }

    function showUpcoming() {
        if (view !== 'upcoming') {
            view = 'upcoming';
            update();
        }
    }

    function showPast() {
        if (view !== 'past') {
            view = 'past';
            update();
        }
    }

</script>

<br/>
<div>
<button on:click={showUpcoming}>Upcoming</button>
<button on:click={showPast}>Past</button>
</div>
<br/>

{#await promise then reservations}
    <ReservationsTable resType={view} reservations={reservations} />
{/await}

