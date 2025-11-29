<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationCard from '../ReservationCard/ReservationCard.svelte';

  export let reservation: any;
  export let showDetails: boolean = false;

  const dispatch = createEventDispatcher();
  const handleReservationClick = () => {
    if (showDetails) dispatch('reservationClick', reservation);
  };
  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch('delete', reservation);
  };
</script>

<div class="flex items-stretch justify-between gap-2">
  <div class="flex-1 min-w-0">
    <ReservationCard reservation={reservation} clickable={showDetails} on:click={handleReservationClick} />
  </div>
  {#if reservation?.res_status === 'pending'}
    <div class="shrink-0 flex items-center z-10 relative">
      <button
        class="btn btn-error btn-sm btn-square w-8 h-8 rounded-lg text-white text-base"
        aria-label="Delete pending reservation"
        title="Delete pending reservation"
        on:click|stopPropagation={handleDeleteClick}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="block w-4 h-4">
          <path d="M9 3a1 1 0 00-1 1v1H5.5a1 1 0 100 2H6v11a2 2 0 002 2h8a2 2 0 002-2V7h.5a1 1 0 100-2H16V4a1 1 0 00-1-1H9zm2 3h2V4h-2v2zm-2 4a1 1 0 112 0v7a1 1 0 11-2 0V10zm6 0a1 1 0 112 0v7a1 1 0 11-2 0V10z" />
        </svg>
      </button>
    </div>
  {/if}
</div>
