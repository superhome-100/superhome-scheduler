<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let showModal = false;

  const handleConfirm = () => {
    dispatch('confirm');
  };

  const handleCancel = () => {
    dispatch('cancel');
  };
</script>

<svelte:window on:keydown={(e) => showModal && e.key === 'Escape' && handleCancel()} />

<!-- Sign Out Confirmation Modal -->
{#if showModal}
  <div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    aria-label="Confirm Sign Out"
    tabindex="-1"
    on:click|self={handleCancel}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCancel()}
  >
    <div 
      class="modal-content sign-out-modal" 
      role="document"
    >
      <div class="modal-header">
        <h2 class="modal-title">Sign Out</h2>
        <button 
          class="modal-close" 
          on:click={handleCancel}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="sign-out-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </div>
        <h3 class="sign-out-title">Are you sure you want to sign out?</h3>
        <p class="sign-out-description">
          You'll need to sign in again to access your reservations and dashboard.
        </p>
      </div>
      
      <div class="modal-footer">
        <button 
          class="btn-secondary" 
          on:click={handleCancel}
        >
          Cancel
        </button>
        <button 
          class="btn-danger" 
          on:click={handleConfirm}
        >
          Sign Out
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
    max-width: 400px;
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
    text-align: center;
  }

  .sign-out-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
    color: #ef4444;
  }

  .sign-out-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.75rem 0;
  }

  .sign-out-description {
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }

  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .btn-secondary {
    flex: 1;
    padding: 0.75rem 1.5rem;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn-danger {
    flex: 1;
    padding: 0.75rem 1.5rem;
    background: #ef4444;
    color: white;
    border: 1px solid #ef4444;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-danger:hover {
    background: #dc2626;
    border-color: #dc2626;
  }

  .btn-danger:focus,
  .btn-secondary:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

    .btn-secondary,
    .btn-danger {
      width: 100%;
    }
  }
</style>
