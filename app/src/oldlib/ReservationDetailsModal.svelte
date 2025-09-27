<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import { supabase } from './supabase';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
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
      <div class="modal-header">
        <h2 class="modal-title">Reservation Details</h2>
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
        <div class="reservation-details">
          <!-- Header with type and status badges -->
          <div class="reservation-header">
            <div class="badges">
              <span class="type-badge" class:pool={reservation.type === 'Pool'} class:openwater={reservation.type === 'Open Water'} class:classroom={reservation.type === 'Classroom'}>
                {reservation.type}
              </span>
              <span class="status-badge" class:approved={reservation.status === 'approved'} class:pending={reservation.status === 'pending'} class:rejected={reservation.status === 'rejected'} class:completed={reservation.status === 'completed'} class:ongoing={reservation.status === 'ongoing'}>
                {reservation.status}
              </span>
            </div>
            <div class="reservation-date">{formatDate(reservation.date)}</div>
          </div>

          <!-- Main details -->
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Date</span>
              <span class="detail-value">{formatDate(reservation.date)}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Time</span>
              <span class="detail-value">
                {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                {#if reservation.timeOfDay}
                  <span class="time-period">({reservation.timeOfDay})</span>
                {/if}
              </span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Type</span>
              <span class="detail-value">{reservation.type}</span>
            </div>

            <div class="detail-item">
              <span class="detail-label">Status</span>
              <span class="detail-value">{reservation.status}</span>
            </div>

            {#if reservation.timeOfDay}
              <div class="detail-item">
                <span class="detail-label">Time Period</span>
                <span class="detail-value">{reservation.timeOfDay}</span>
              </div>
            {/if}

            {#if reservation?.res_type === 'open_water' || reservation?.type === 'Open Water'}
              {#if owDepth !== null}
                <div class="detail-item">
                  <span class="detail-label">Depth (m)</span>
                  <span class="detail-value">{owDepth}</span>
                </div>
              {/if}
              {#if owAutoPair !== null}
                <div class="detail-item">
                  <span class="detail-label">Auto Pair Selected</span>
                  <span class="detail-value">{owAutoPair ? 'Yes' : 'No'}</span>
                </div>
              {/if}
              <div class="detail-item">
                <span class="detail-label">Paired With</span>
                <span class="detail-value">{owPairedName ?? 'Not paired yet'}</span>
              </div>
            {/if}
          </div>

          {#if reservation.notes}
            <div class="notes-section">
              <h3 class="notes-title">Notes</h3>
              <p class="notes-content">{reservation.notes}</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn btn-primary" 
          on:click={closeModal}
        >
          Close
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
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
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

  .badges {
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
    text-align: right;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
  }

  .time-period {
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
    margin-left: 0.25rem;
  }

  .notes-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
  }

  .notes-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .notes-content {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
    margin: 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 100px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
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

    .details-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .modal-actions {
      padding: 1rem;
    }

    .btn {
      width: 100%;
    }
  }
</style>
