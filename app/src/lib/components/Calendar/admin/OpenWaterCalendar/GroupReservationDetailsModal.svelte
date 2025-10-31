<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { MemberRow } from '$lib/types/groupReservation';
  import { showEquipment } from '$lib/types/groupReservation';
  import ReservationDetailsHeader from './DiversTable/ReservationDetailsHeader.svelte';
  import GroupMembersList from './DiversTable/GroupMembersList.svelte';

  export let open = false;
  export let resDate: string = '';
  export let timePeriod: 'AM' | 'PM' = 'AM';
  export let boat: string | null = null;
  export let buoyName: string | null = null;
  export let members: MemberRow[] = [];

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  // Equipment visibility and aggregated flags
  $: shouldShowEquipment = members && members.length > 0 && members.some((m) => showEquipment(m.activity_type));
  $: equipPulley = members?.some((m) => !!m.pulley) || false;
  $: equipBottomPlate = members?.some((m) => !!m.bottom_plate) || false;
  $: equipLargeBuoy = members?.some((m) => !!m.large_buoy) || false;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="dialog"
    aria-modal="true"
    aria-label="Group Reservation Details"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Group Reservation Details</h2>
        <button 
          class="modal-close" 
          on:click={close}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <ReservationDetailsHeader 
          {resDate} 
          {timePeriod} 
          {boat} 
          {buoyName} 
          {members} 
        />
        <GroupMembersList {members} />

        {#if shouldShowEquipment}
          <div class="equipment-section">
            <h3 class="equipment-title">Equipment</h3>
            <div class="equipment-grid">
              <div class="detail-item">
                <span class="detail-label">Pulley</span>
                <span class="detail-value">{equipPulley ? 'Yes' : 'No'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Bottom Plate</span>
                <span class="detail-value">{equipBottomPlate ? 'Yes' : 'No'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Large Buoy</span>
                <span class="detail-value">{equipLargeBuoy ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn btn-primary text-white" 
          on:click={close}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @import '../../../../../styles/groupReservationModal.css';

  .equipment-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }

  .equipment-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
  .detail-label { font-size: 0.75rem; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .detail-value { font-size: 0.875rem; color: #1e293b; font-weight: 500; }

  @media (max-width: 768px) {
    .equipment-grid { grid-template-columns: 1fr 1fr; gap: 0.375rem; }
    .equipment-title { font-size: 0.75rem; margin-bottom: 0.375rem; }
  }
</style>
