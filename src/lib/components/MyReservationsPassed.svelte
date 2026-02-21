<script lang="ts">
	import { storedPastReservations, storedPastReservationsLoading } from '$lib/client/stores';
	import MyReservations from '$lib/components/MyReservations.svelte';
</script>

<MyReservations
	resPeriod="past"
	reservations={$storedPastReservations}
	isLoading={$storedPastReservationsLoading}
/>
