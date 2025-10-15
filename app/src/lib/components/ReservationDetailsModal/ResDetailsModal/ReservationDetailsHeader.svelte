<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let displayType: string;
  export let displayStatus: string;

  const closeModal = () => {
    dispatch('close');
  };
</script>

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

<div class="reservation-header">
  <div class="badges">
    <span class="type-badge" class:pool={displayType === 'Pool'} class:openwater={displayType === 'Open Water'} class:classroom={displayType === 'Classroom'}>
      {displayType}
    </span>
    <span class="status-badge" class:approved={displayStatus === 'approved'} class:confirmed={displayStatus === 'confirmed'} class:pending={displayStatus === 'pending'} class:rejected={displayStatus === 'rejected'} class:completed={displayStatus === 'completed'} class:ongoing={displayStatus === 'ongoing'}>
      {displayStatus}
    </span>
  </div>
</div>

<style>
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem 0 1.5rem;
    border-bottom: none;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    line-height: 1;
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

  .reservation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
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

  .status-badge.confirmed {
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

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-header {
      padding: 0.5rem 0.75rem;
    }

    .modal-title {
      font-size: 0.875rem;
    }

    .reservation-header {
      flex-direction: column;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
    }

    .badges {
      gap: 0.375rem;
    }

    .type-badge, .status-badge {
      font-size: 0.625rem;
      padding: 0.1875rem 0.375rem;
    }
  }
</style>
