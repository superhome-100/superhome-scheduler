<script lang="js">
    import MyReservations from '$lib/components/MyReservations.svelte';
    import { userId } from '$lib/stores.js';
 
    export let data;
 
    async function fetchReservations() {
        const response = await fetch(`/${data.name}`, {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: $userId, view: 'upcoming' })
        });
        const rsvs = await response.json();
        return rsvs;
    }

</script>

{#await fetchReservations() then reservations}
    <MyReservations name={data.name} reservations={reservations}/>
{/await}
