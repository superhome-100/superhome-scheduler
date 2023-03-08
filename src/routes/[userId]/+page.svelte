<script lang="js">
    import MyReservations from '$lib/components/MyReservations.svelte';
    export let data;
</script>
<MyReservations userId={data.userId} reservations={data.reservations}/>
