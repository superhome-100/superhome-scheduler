<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationCard from '../ReservationCard/ReservationCard.svelte';

  export let reservation: any;
  export let showDetails: boolean = false;
  export let showPrice: boolean = true;

  const dispatch = createEventDispatcher();
  const handleReservationClick = () => {
    if (showDetails) dispatch('reservationClick', reservation);
  };
</script>

<div class="flex items-stretch justify-between gap-2">
  <div class="flex-1 min-w-0">
    <ReservationCard reservation={reservation} clickable={showDetails} showPrice={showPrice} on:click={handleReservationClick} />
  </div>
  <!-- Pending reservation delete button removed per requirements -->
</div>
