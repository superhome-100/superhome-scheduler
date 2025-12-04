<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationItem from './ReservationItem.svelte';
  import EmptyState from './EmptyState.svelte';

  export let reservations: any[] = [];
  export let showDetails: boolean = false;
  export let showPrice: boolean = true;

  const dispatch = createEventDispatcher();

  const handleReservationClick = (event: CustomEvent) => {
    dispatch('reservationClick', event.detail);
  };
  const handleDelete = (event: CustomEvent) => {
    dispatch('delete', event.detail);
  };
</script>

{#if reservations.length > 0}
  <div class="reservations-list">
    {#each reservations as reservation}
      <ReservationItem 
        {reservation} 
        {showDetails}
        {showPrice}
        on:reservationClick={handleReservationClick}
        on:delete={handleDelete}
      />
    {/each}
  </div>
{:else}
  <EmptyState />
{/if}

<style>
  .reservations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
