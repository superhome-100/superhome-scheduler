<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { MemberRow } from '$lib/types/groupReservation';
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
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn btn-primary" 
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
</style>
