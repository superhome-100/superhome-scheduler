<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title: string = 'Reservation Error';
  export let message: string = '';
  export let confirmText: string = 'Close';

  const dispatch = createEventDispatcher();

  const close = () => {
    open = false;
    dispatch('close');
  };
</script>

<svelte:window on:keydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
  <div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="0"
    on:click|self={close}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && close()}
  >
    <div class="modal-content" role="document">
      <div class="modal-header">
        <h2 class="modal-title flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>{title}</span>
        </h2>
      </div>

      <div class="modal-body">
        {#if message}
          <p class="error-message">{message}</p>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700" on:click={close}>{confirmText}</button>
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
    background: white; /* white panel */
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 420px;
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
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .modal-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #dc2626; /* red title as requested */
    margin: 0;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .error-message {
    color: #dc2626; /* red text for message */
    margin: 0.25rem 0 0 0;
    font-size: 0.95rem;
    line-height: 1.5;
    word-break: break-word;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }


  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-overlay { padding: 0.5rem; }
    .modal-content { max-height: 95vh; }
    .modal-header, .modal-body, .modal-footer { padding: 1rem; }
  }
</style>
