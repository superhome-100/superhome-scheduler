<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../../utils/supabase';
  import ModalHeader from './ModalHeader.svelte';
  import ReservationBadges from './ReservationBadges.svelte';
  import ReservationDetailsGrid from './ReservationDetailsGrid.svelte';
  import OpenWaterDetails from './OpenWaterDetails.svelte';
  import ReservationNotes from './ReservationNotes.svelte';
  import ModalActions from './ModalActions.svelte';
  import { formatDate } from './modalUtils';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservation: any = null;

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

  // Open Water detail state (loaded on demand)
  let owDepth: number | null = null;
  let owAutoPair: boolean | null = null;
  let owPairedName: string | null = null;

  async function loadOpenWaterDetails() {
    try {
      owDepth = null; owAutoPair = null; owPairedName = null;
      // Expect raw identifiers on reservation
      const isOW = reservation?.res_type === 'open_water' || reservation?.type === 'Open Water';
      if (!isOW || !reservation?.uid || !reservation?.res_date) return;
      const { data, error } = await supabase.rpc('get_openwater_pair_info', {
        p_uid: reservation.uid,
        p_res_date: reservation.res_date
      });
      if (error || !data || data.length === 0) return;
      const row = data[0];
      owDepth = row.depth_m ?? null;
      owAutoPair = row.auto_adjust_closest ?? null;
      owPairedName = row.paired_name ?? null;
    } catch (_) {
      // ignore
    }
  }

  $: if (isOpen && reservation) {
    // Lazy load only for open water
    if (reservation?.res_type === 'open_water' || reservation?.type === 'Open Water') {
      loadOpenWaterDetails();
    }
  }

</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && reservation}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Reservation Details"
    tabindex="-1"
  >
    <div class="modal-content">
      <ModalHeader on:close={closeModal} />

      <div class="modal-body">
        <div class="reservation-details">
          <!-- Header with type and status badges -->
          <div class="reservation-header">
            <ReservationBadges {reservation} />
            <div class="reservation-date">
              {#if reservation?.date}
                {formatDate(reservation.date)}
              {:else if reservation?.res_date}
                {formatDate(reservation.res_date)}
              {:else}
                No Date Available
              {/if}
            </div>
          </div>

          <!-- Main details -->
          <ReservationDetailsGrid {reservation} />

          <!-- Open Water specific details -->
          <OpenWaterDetails 
            {reservation} 
            {owDepth} 
            {owAutoPair} 
            {owPairedName} 
          />

          <!-- Notes section -->
          <ReservationNotes {reservation} />
        </div>
      </div>

      <ModalActions on:close={closeModal} />
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
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }


  .modal-body {
    padding: 1.5rem;
    flex: 1;
  }

  .reservation-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .reservation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }


  .reservation-date {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    text-align: right;
  }


  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 95vh;
    }

    .reservation-header {
      flex-direction: column;
      gap: 0.75rem;
    }

    .reservation-date {
      text-align: left;
    }
  }
</style>
