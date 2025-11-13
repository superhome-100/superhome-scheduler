<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationCard from '../ReservationCard/ReservationCard.svelte';

  export let reservation: any;
  export let showDetails: boolean = false;

  const dispatch = createEventDispatcher();
  const handleReservationClick = () => {
    if (showDetails) dispatch('reservationClick', reservation);
  };
</script>

<ReservationCard reservation={reservation} clickable={showDetails} on:click={handleReservationClick} />
