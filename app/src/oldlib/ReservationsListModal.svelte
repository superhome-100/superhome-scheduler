<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservations: any[] = [];
  export let title = 'Reservations';
  export let showDetails = false; // New prop to enable click functionality

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

  const handleReservationClick = (reservation: any) => {
    if (showDetails) {
      dispatch('reservationClick', reservation);
    }
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
      <div class="modal-header">
        <h2 class="modal-title">{title}</h2>
        <button 
          class="modal-close" 
          on:click={closeModal}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if reservations.length > 0}
          <div class="reservations-list">
            {#each reservations as reservation}
              <div 
                class="reservation-item compact" 
                class:clickable={showDetails} 
                on:click={() => handleReservationClick(reservation)} 
                role={showDetails ? "button" : ""} 
                {...(showDetails ? { tabindex: 0 } : {})} 
                on:keydown={(e) => showDetails && e.key === 'Enter' && handleReservationClick(reservation)}
              >
                <div class="compact-content">
                  <span class="compact-date">{new Date(reservation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span class="compact-time">{reservation.startTime}</span>
                  <span class="type-badge compact" class:pool={reservation.type === 'Pool'} class:openwater={reservation.type === 'Open Water'} class:classroom={reservation.type === 'Classroom'}>
                    {reservation.type}
                  </span>
                  <span class="status-badge compact" class:approved={reservation.status === 'approved'} class:pending={reservation.status === 'pending'} class:rejected={reservation.status === 'rejected'} class:completed={reservation.status === 'completed'} class:ongoing={reservation.status === 'ongoing'}>
                    {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <p class="empty-text">No reservations found</p>
          </div>
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

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }

  .modal-title {
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
    flex: 1;
    overflow-y: auto;
  }

  .reservations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .reservation-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .reservation-item.compact {
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reservation-item.compact:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .compact-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .compact-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    min-width: 60px;
  }

  .compact-time {
    font-size: 0.875rem;
    color: #64748b;
    min-width: 80px;
  }

  .type-badge.compact {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.compact {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reservation-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .reservation-item.clickable {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reservation-item.clickable:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .reservation-item.clickable:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .reservation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .reservation-type {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .type-badge.openwater {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.approved {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .status-badge.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .status-badge.rejected {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .status-badge.completed {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .status-badge.ongoing {
    background: rgba(168, 85, 247, 0.1);
    color: #7c3aed;
  }

  .reservation-date {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
  }

  .reservation-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .time-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .time-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .time-value {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
  }

  .time-period {
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
  }

  .notes {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .notes-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .notes-value {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.4;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #64748b;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
    text-align: center;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 90vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-body {
      padding: 1rem;
    }

    .reservation-header {
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .reservation-date {
      align-self: flex-end;
    }
  }
</style>
