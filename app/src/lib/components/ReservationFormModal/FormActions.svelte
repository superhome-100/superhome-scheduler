<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  export let loading = false;

  const dispatch = createEventDispatcher();

  const closeModal = () => {
    dispatch('close');
  };
</script>

<div class="modal-actions">
  <button 
    type="button" 
    class="btn btn-secondary" 
    on:click={closeModal}
  >
    Cancel
  </button>
  <button 
    type="submit" 
    class="btn btn-primary"
    disabled={loading}
  >
    {#if loading}
      <LoadingSpinner size="sm" />
      Submitting...
    {:else}
      Submit Reservation
    {/if}
  </button>
</div>

<style>
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
    padding-top: 1rem;
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

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .btn-primary {
    background: #3b82f6;
    color: hsl(var(--bc));
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
