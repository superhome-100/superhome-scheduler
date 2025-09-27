<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const closeModal = () => {
    dispatch('close');
  };
</script>

<div class="modal-actions">
  <button 
    type="button" 
    class="btn btn-primary" 
    on:click={closeModal}
  >
    Close
  </button>
</div>

<style>
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
    .modal-actions {
      padding: 1rem;
    }

    .btn {
      width: 100%;
    }
  }
</style>
