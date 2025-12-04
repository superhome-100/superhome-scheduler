<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ListModalHeader from './ListModalHeader.svelte';
  import ReservationList from './ReservationList.svelte';
  import GroupedCompletedList from '../ReservationTotals/GroupedCompletedList.svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservations: any[] = [];
  export let title = 'Reservations';
  export let showDetails = false; // New prop to enable click functionality
  // Controls how the list is rendered in the modal
  export let variant: 'upcoming' | 'completed' | 'all' = 'all';
  // Optional server-computed monthly totals keyed by 'YYYY-MM'
  export let monthlyTotals: Record<string, number> = {};

  const closeModal = () => {
    dispatch('close');
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  const handleReservationClick = (event: CustomEvent) => {
    if (showDetails) {
      dispatch('reservationClick', event.detail);
    }
  };

  const handleDelete = (event: CustomEvent) => {
    dispatch('delete', event.detail);
  };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="-1"
  >
    <div class="modal-content">
      <ListModalHeader {title} on:close={closeModal} />

      <div class="modal-body">
        {#if variant === 'completed'}
          <!-- Grouped monthly list with totals for Completed reservations -->
          <GroupedCompletedList
            reservations={reservations}
            monthlyTotals={monthlyTotals}
            on:reservationClick={(e) => handleReservationClick(e)}
          />
        {:else}
          <!-- Flat list for Upcoming / All -->
          <ReservationList 
            {reservations} 
            {showDetails}
            showPrice={variant === 'completed'}
            on:reservationClick={handleReservationClick}
            on:delete={handleDelete}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 800px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }


  .modal-body {
    padding: 1.5rem;
    flex: 1;
    overflow-y: auto;
  }


  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 90vh;
    }

    .modal-body {
      padding: 1rem;
    }
  }
</style>
