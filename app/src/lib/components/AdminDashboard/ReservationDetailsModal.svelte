<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTypeDisplay } from '../../utils/reservationTransform';
  import dayjs from 'dayjs';

  const dispatch = createEventDispatcher();

  export let showModal = false;
  export let selectedReservation: any = null;
  export let processingReservation: string | null = null;

  const closeModal = () => {
    dispatch('closeModal');
  };

  const handleReservationAction = (action: 'approve' | 'reject') => {
    dispatch('reservationAction', { reservation: selectedReservation, action });
  };

</script>

<svelte:window on:keydown={(e) => showModal && e.key === 'Escape' && closeModal()} />

{#if showModal && selectedReservation}
  <div 
    class="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="details-modal-title"
    tabindex="-1"
    on:click|self={closeModal}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeModal()}
  >
  <div class="modal-box max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl mx-auto rounded-2xl" style="padding: 1.5rem 1.5rem 1.5rem 1.5rem;">
      <!-- Modal Header -->
      <div class="flex justify-between items-center py-4 px-6 border-b border-base-300 rounded-t-2xl -mx-8 -mt-8 mb-4">
        <h3 id="details-modal-title" class="text-lg sm:text-xl font-semibold text-[#00294C] pr-2">Reservation Details</h3>
        <button class="btn btn-ghost btn-sm btn-circle flex-shrink-0" on:click={closeModal} aria-label="Close modal">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <!-- Modal Body -->
      <div class="px-6 py-4 overflow-y-auto flex-1">
        <div class="space-y-2">
          <h4 class="text-base font-semibold text-[#00294C] mb-2">Reservation</h4>
          
          <div class="space-y-3">
            <div class="flex items-start gap-3 min-w-0">
              <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">User:</span> 
              <span class="text-xs text-[#00294C] truncate flex-1">{selectedReservation.user_profiles?.nickname || selectedReservation.user_profiles?.name || 'Unknown User'}</span>
            </div>
            
            <div class="flex items-start gap-3 min-w-0">
              <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Type:</span> 
              <span class="text-xs text-[#00294C] truncate flex-1">{getTypeDisplay(selectedReservation.res_type)}</span>
            </div>
            
            <div class="flex items-start gap-3 min-w-0">
              <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Date:</span> 
              <span class="text-xs text-[#00294C] truncate flex-1">{dayjs(selectedReservation.res_date).format('dddd, MMMM D, YYYY [at] h:mm A')}</span>
            </div>
            
            {#if selectedReservation.title}
              <div class="flex items-start gap-3 min-w-0">
                <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Title:</span> 
                <span class="text-xs text-[#00294C] truncate flex-1">{selectedReservation.title}</span>
              </div>
            {/if}
            
            {#if selectedReservation.description}
              <div class="flex items-start gap-3 min-w-0">
                <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Description:</span> 
                <span class="text-xs text-[#00294C] truncate flex-1">{selectedReservation.description}</span>
              </div>
            {/if}
            
            {#if selectedReservation.start_time}
              <div class="flex items-start gap-3 min-w-0">
                <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Start Time:</span> 
                <span class="text-xs text-[#00294C] truncate flex-1">{dayjs(`2000-01-01T${selectedReservation.start_time}`).format('h:mm A')}</span>
              </div>
            {/if}
            
            {#if selectedReservation.end_time}
              <div class="flex items-start gap-3 min-w-0">
                <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">End Time:</span> 
                <span class="text-xs text-[#00294C] truncate flex-1">{dayjs(`2000-01-01T${selectedReservation.end_time}`).format('h:mm A')}</span>
              </div>
            {/if}
            
            <div class="flex items-start gap-3 min-w-0">
              <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Status:</span> 
              <span class="badge badge-warning badge-xs" class:badge-warning={selectedReservation.res_status === 'pending'}>
                {selectedReservation.res_status}
              </span>
            </div>
            
            {#if selectedReservation.res_type === 'pool'}
              {#if selectedReservation.pool_type}
                <div class="flex items-start gap-3 min-w-0">
                  <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Pool Type:</span> 
                  <span class="text-xs text-[#00294C] truncate flex-1">{selectedReservation.pool_type}</span>
                </div>
              {/if}
              
              {@const totalLanes = 8}
              {@const explicitLane = selectedReservation?.lane ?? selectedReservation?.res_pool?.lane}
              {@const startIdx = typeof selectedReservation?.__display_lane_idx === 'number' ? (selectedReservation.__display_lane_idx as number) : (explicitLane ? (Number(explicitLane) - 1) : -1)}
              {@const poolType = selectedReservation?.pool_type ?? selectedReservation?.poolType ?? selectedReservation?.res_pool?.pool_type ?? selectedReservation?.res_pool?.poolType}
              {@const studentsRaw = selectedReservation?.student_count ?? selectedReservation?.res_pool?.student_count}
              {@const students = typeof studentsRaw === 'string' ? parseInt(studentsRaw, 10) : (studentsRaw || 0)}
              {@const spanFromType = poolType === 'course_coaching' ? Math.max(1, Math.min(1 + (Number.isFinite(students) ? students : 0), totalLanes)) : 1}
              {@const span = typeof selectedReservation?.__display_span === 'number' ? (selectedReservation.__display_span as number) : spanFromType}
              {@const lanes = (startIdx >= 0 && span > 0) ? Array.from({ length: span }, (_, i) => String(startIdx + 1 + i)).filter(n => Number(n) >= 1 && Number(n) <= totalLanes) : []}
              {#if lanes.length}
                <div class="flex items-start gap-3 min-w-0">
                  <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Lane(s):</span> 
                  <span class="text-xs text-[#00294C] truncate flex-1">{lanes.join(', ')}</span>
                </div>
              {/if}
            {/if}
            
            <div class="flex items-start gap-3 min-w-0">
              <span class="font-semibold text-[#00294C] text-xs flex-shrink-0 w-16">Requested:</span> 
              <span class="text-xs text-[#00294C] truncate flex-1">{dayjs(selectedReservation.created_at).format('dddd, MMMM D, YYYY [at] h:mm A')}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-base-300 bg-base-200 rounded-b-2xl -mx-8 -mb-8 mt-4">
        <div class="grid grid-cols-2 gap-2">
          <button 
            class="btn btn-xs gap-1 w-full"
            style="background-color: #dc3545 !important; border-color: #dc3545 !important; color: white !important;"
            on:click={() => handleReservationAction('reject')}
            disabled={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            aria-busy={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            title="Reject reservation"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            Reject
          </button>
          
          <button 
            class="btn btn-xs gap-1 w-full"
            style="background-color: #28a745 !important; border-color: #28a745 !important; color: white !important;"
            on:click={() => handleReservationAction('approve')}
            disabled={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            aria-busy={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            title="Approve reservation"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Approve
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom styles for elements that can't be handled by Tailwind/DaisyUI */
  .modal-box {
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    border: 2px solid #00294C;
    background-color: #f8f9fa;
    max-width: 512px;
    width: 90%;
    min-height: 400px;
  }
  
  /* Ensure proper z-index for modal overlay */
  .fixed.inset-0 {
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }
  
  /* Mobile responsive adjustments */
  @media (max-width: 640px) {
    .fixed.inset-0 {
      padding: 0.5rem;
    }
    
    .modal-box {
      max-height: 95vh;
      background-color: #f8f9fa;
      border: 2px solid #00294C;
      width: 95%;
      max-width: 480px;
      margin: 0 auto;
      transform: none;
      border-radius: 20px;
      min-height: 350px;
    }
  }
  
  /* Desktop enhancements */
  @media (min-width: 641px) {
    .modal-box {
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05);
      border: 2px solid #00294C;
      max-width: 512px;
      width: 90%;
      min-height: 400px;
    }
  }
  
  /* Ensure perfect centering with transform */
  .fixed.inset-0 {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
</style>
