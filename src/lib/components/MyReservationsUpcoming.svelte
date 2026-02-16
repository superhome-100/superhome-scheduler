<script lang="ts">
	import { storedIncomingReservations } from '$lib/client/stores';
	import MyReservations from '$lib/components/MyReservations.svelte';
</script>

<MyReservations resPeriod="upcoming" reservations={$storedIncomingReservations} />
