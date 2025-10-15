<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatDateTime } from '../../../utils/dateUtils';
  import dayjs from 'dayjs';
  import ReservationDetailsHeader from './ReservationDetailsHeader.svelte';
  import ReservationDetailsBody from './ReservationDetailsBody.svelte';
  import ReservationDetailsActions from './ReservationDetailsActions.svelte';
  import OpenWaterDetailsLoader from './OpenWaterDetailsLoader.svelte';
  import './ReservationDetailsStyles.css';

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

  // Get display values for the reservation (unified structure)
  $: displayType = reservation?.type || (reservation?.res_type === 'pool' ? 'Pool' : 
                                        reservation?.res_type === 'open_water' ? 'Open Water' : 
                                        reservation?.res_type === 'classroom' ? 'Classroom' : 
                                        reservation?.res_type);
  
  $: displayStatus = reservation?.status || reservation?.res_status || 'pending';
  
  $: displayDate = reservation?.date || reservation?.res_date;
  
  $: displayStartTime = reservation?.startTime || reservation?.start_time;
  $: displayEndTime = reservation?.endTime || reservation?.end_time;
  $: displayTimePeriod = reservation?.time_period;
  
  // Debug logging
  $: if (reservation) {
    console.log('ReservationDetailsModal: reservation data:', reservation);
    console.log('ReservationDetailsModal: displayDate:', displayDate);
    console.log('ReservationDetailsModal: displayStartTime:', displayStartTime);
    console.log('ReservationDetailsModal: displayEndTime:', displayEndTime);
    console.log('ReservationDetailsModal: deep_fim_training:', reservation.deep_fim_training);
    console.log('ReservationDetailsModal: pulley:', reservation.pulley);
    console.log('ReservationDetailsModal: bottom_plate:', reservation.bottom_plate);
    console.log('ReservationDetailsModal: large_buoy:', reservation.large_buoy);
  }
  
  $: displayNotes = reservation?.notes || reservation?.note;
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
      <ReservationDetailsHeader 
        {displayType} 
        {displayStatus} 
        on:close={closeModal}
      />

      <ReservationDetailsBody
        {reservation}
        {displayType}
        {displayDate}
        {displayNotes}
        bind:owDepth
      />

      <ReservationDetailsActions on:close={closeModal} />
    </div>
  </div>
{/if}
