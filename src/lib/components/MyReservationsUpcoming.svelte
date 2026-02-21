<script lang="ts">
	import {
		storedIncomingReservations,
		storedIncomingReservationsLoading
	} from '$lib/client/stores';
	import MyReservations from '$lib/components/MyReservations.svelte';
</script>

<MyReservations
	resPeriod="upcoming"
	reservations={$storedIncomingReservations}
	isLoading={$storedIncomingReservationsLoading}
/>
