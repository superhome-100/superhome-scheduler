<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import { formatDate, formatTime, getTypeDisplay } from './adminUtils';

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
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="details-modal-title"
    tabindex="-1"
    on:click|self={closeModal}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeModal()}
  >
    <div class="modal-content" role="document" tabindex="-1">
      <div class="modal-header">
        <h3 id="details-modal-title">Reservation Details</h3>
        <button class="modal-close" on:click={closeModal} aria-label="Close modal">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="reservation-summary">
          <h4>Reservation</h4>
          <p><strong>User:</strong> {selectedReservation.user_profiles?.name || 'Unknown User'}</p>
          <p><strong>Type:</strong> {getTypeDisplay(selectedReservation.res_type)}</p>
          <p><strong>Date:</strong> {formatDate(selectedReservation.res_date, 'long')}</p>
          {#if selectedReservation.title}
            <p><strong>Title:</strong> {selectedReservation.title}</p>
          {/if}
          {#if selectedReservation.description}
            <p><strong>Description:</strong> {selectedReservation.description}</p>
          {/if}
          {#if selectedReservation.start_time}
            <p><strong>Start Time:</strong> {formatTime(selectedReservation.start_time)}</p>
          {/if}
          {#if selectedReservation.end_time}
            <p><strong>End Time:</strong> {formatTime(selectedReservation.end_time)}</p>
          {/if}
          <p><strong>Status:</strong> 
            <span class="status-badge" class:pending={selectedReservation.res_status === 'pending'}>
              {selectedReservation.res_status}
            </span>
          </p>
          <p><strong>Requested:</strong> {formatDate(selectedReservation.created_at, 'long')}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button 
          class="action-btn reject"
          on:click={() => handleReservationAction('reject')}
          disabled={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
        >
          {#if processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            <LoadingSpinner size="sm" />
          {:else}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            Reject
          {/if}
        </button>
        <button 
          class="action-btn approve"
          on:click={() => handleReservationAction('approve')}
          disabled={processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
        >
          {#if processingReservation === `${selectedReservation.uid}-${selectedReservation.res_date}`}
            <LoadingSpinner size="sm" />
          {:else}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Approve
          {/if}
        </button>
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
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .reservation-summary h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .reservation-summary p {
    margin: 0 0 0.75rem 0;
    color: #374151;
    line-height: 1.5;
  }

  .reservation-summary p:last-child {
    margin-bottom: 0;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
    margin-left: 0.5rem;
  }

  .status-badge.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .modal-footer {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .action-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .action-btn.approve {
    background: #10b981;
    color: white;
    border: 1px solid #10b981;
  }

  .action-btn.approve:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .action-btn.reject {
    background: #ef4444;
    color: white;
    border: 1px solid #ef4444;
  }

  .action-btn.reject:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 95vh;
    }

    .modal-header,
    .modal-body,
    .modal-footer {
      padding: 1rem;
    }

    .modal-footer {
      flex-direction: column;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
