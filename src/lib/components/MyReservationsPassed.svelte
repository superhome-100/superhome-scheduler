<script lang="ts">
	import { storedPastReservations } from '$lib/client/stores';
	import MyReservations from '$lib/components/MyReservations.svelte';
</script>

<MyReservations resPeriod="past" reservations={$storedPastReservations} />
