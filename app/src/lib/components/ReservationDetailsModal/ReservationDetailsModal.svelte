<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatDateTime } from '../../utils/dateUtils';
  import dayjs from 'dayjs';
  import ReservationDetailsHeader from './ResDetailsModal/ReservationDetailsHeader.svelte';
  import ReservationDetailsBody from './ResDetailsModal/ReservationDetailsBody.svelte';
  import ReservationDetailsActions from './ResDetailsModal/ReservationDetailsActions.svelte';
  import OpenWaterDetailsLoader from './ResDetailsModal/OpenWaterDetailsLoader.svelte';
  import './ResDetailsModal/ReservationDetailsStyles.css';
  import { getEditPhase, type EditPhase } from '../../utils/cutoffRules';
  import { reservationStore } from '../../stores/reservationStore';
  import ConfirmModal from '../ConfirmModal.svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservation: any = null;
  export let isAdmin: boolean = false;
  export let currentUserId: string | undefined = undefined;
  // Optional callback prop for edit action (in addition to event dispatch)
  export let onEdit: (() => void) | null = null;

  const closeModal = () => {
    dispatch('close');
  };

  const emitUpdated = () => {
    dispatch('updated');
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
  // Edit handled by parent via 'edit' event
  let confirmOpen = false;

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

  // Determine upcoming and permissions based on cutoff phases
  const getOriginalIso = () => reservation?.res_date as string | undefined;
  const getStartTime = () => reservation?.start_time || reservation?.res_pool?.start_time || reservation?.res_classroom?.start_time || '';
  const getTimeOfDay = () => (reservation?.res_openwater?.time_period || reservation?.time_period || 'AM') as 'AM' | 'PM';

  $: upcoming = (() => {
    if (!reservation?.res_date) return false;
    return new Date(reservation.res_date).getTime() > Date.now();
  })();

  $: editPhase = (() => {
    if (!reservation) return 'before_mod_cutoff' as EditPhase;
    const t = reservation.res_type as 'open_water' | 'pool' | 'classroom';
    const iso = getOriginalIso()!;
    if (t === 'open_water') return getEditPhase(t, iso, undefined, getTimeOfDay());
    return getEditPhase(t, iso, getStartTime(), undefined);
  })();

  // Owner-only control: only the reservation owner can see Edit
  $: isOwner = (() => {
    if (!reservation || !currentUserId) return false;
    try {
      return String(reservation.uid) === String(currentUserId);
    } catch {
      return false;
    }
  })();

  $: canEdit = (() => {
    if (!reservation) return false;
    if (!isOwner) return false; // Gate to owner only
    if (!upcoming) return false;
    const status = String(reservation?.res_status || reservation?.status).toLowerCase();
    if (!['pending', 'confirmed'].includes(status)) return false;
    // Allow edit in both phases except after cancel cutoff; modal will restrict fields when between mod and cancel
    return editPhase !== 'after_cancel_cutoff';
  })();

  $: canCancel = (() => {
    if (!reservation) return false;
    if (!isOwner) return false; // Gate to owner only
    if (!upcoming) return false;
    // Only allow before cancel cutoff
    return editPhase !== 'after_cancel_cutoff';
  })();

  function handleCancel() {
    if (!reservation) return;
    confirmOpen = true;
  }

  async function confirmCancel() {
    if (!reservation) return;
    const t = reservation.res_type as 'open_water' | 'pool' | 'classroom';
    const start = reservation?.res_pool?.start_time || reservation?.res_classroom?.start_time || reservation?.start_time || undefined;
    const period = (reservation?.res_openwater?.time_period || reservation?.time_period) as 'AM' | 'PM' | undefined;
    const { success, error } = await reservationStore.cancelReservation(reservation.uid, reservation.res_date, {
      res_type: t,
      start_time: start,
      time_period: t === 'open_water' ? (period || 'AM') : undefined
    });
    if (success) {
      emitUpdated();
      closeModal();
    } else {
      console.error('Failed to cancel reservation:', error);
    }
  }

  // Compute display name for both admins and users
  const getDisplayName = (res: any): string => {
    if (!res) return '';
    const uid = res?.uid ? String(res.uid) : undefined;
    if (!isAdmin && currentUserId && uid && String(currentUserId) === uid) return 'You';
    const nick = res?.user_profiles?.nickname;
    if (nick) return nick as string;
    const fullName = res?.user_profiles?.name;
    if (fullName) return fullName as string;
    // For non-admins, avoid leaking other identifiers; just show generic label
    return isAdmin ? 'Unknown User' : 'Member';
  };

  $: userName = getDisplayName(reservation);
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

      <ReservationDetailsActions 
        {canEdit}
        {canCancel}
        on:edit={() => { 
          if (typeof onEdit === 'function') { 
            console.log('ReservationDetailsModal: invoking onEdit prop');
            try { onEdit(); } catch (e) { console.error('onEdit prop error:', e); }
          }
          console.log('ReservationDetailsModal: edit event dispatched'); 
          dispatch('edit'); 
        }}
        on:cancel={handleCancel}
        on:close={closeModal} 
      />
    </div>
  </div>
{/if}

<!-- Cancel Confirmation Modal -->
<ConfirmModal
  bind:open={confirmOpen}
  title="Cancel reservation?"
  message="Are you sure you want to cancel this reservation? This action cannot be undone."
  confirmText="Yes, cancel"
  cancelText="No, keep it"
  on:confirm={confirmCancel}
  on:cancel={() => { /* noop, just close */ }}
/>