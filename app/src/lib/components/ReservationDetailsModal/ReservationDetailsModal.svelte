<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatDateTime } from '../../utils/dateUtils';
  import dayjs from 'dayjs';
  import ReservationDetailsHeader from './ResDetailsModal/ReservationDetailsHeader.svelte';
  import ReservationDetailsBody from './ResDetailsModal/ReservationDetailsBody.svelte';
  import ReservationDetailsActions from './ResDetailsModal/ReservationDetailsActions.svelte';
  import OpenWaterDetailsLoader from './ResDetailsModal/OpenWaterDetailsLoader.svelte';
  import './ResDetailsModal/ReservationDetailsStyles.css';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservation: any = null;
  export let isAdmin: boolean = false;

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

  // Get user's full name for admin display
  const getUserFullName = (res: any): string => {
    if (!isAdmin) return '';
    
    // Try to get full name from user_profiles.name
    const fullName = res?.user_profiles?.name;
    if (fullName) {
      return fullName;
    }
    
    // Fallback to other name fields for admin
    const username = res?.user_profiles?.username || res?.username;
    const email = res?.user_profiles?.email || res?.email;
    
    if (username) {
      return username;
    } else if (email) {
      return email.split('@')[0]; // Use email prefix as fallback
    }
    
    // Final fallback for admin
    return 'Unknown User';
  };

  $: userName = isAdmin ? getUserFullName(reservation) : '';
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
        {userName}
        on:close={closeModal}
      />

      <ReservationDetailsBody
        {reservation}
        {displayType}
        {displayDate}
        {displayNotes}
        {isAdmin}
        bind:owDepth
      />

      <ReservationDetailsActions on:close={closeModal} />
    </div>
  </div>
{/if}