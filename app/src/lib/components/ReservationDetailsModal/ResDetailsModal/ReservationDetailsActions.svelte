<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let canEdit: boolean = false;
  export let canCancel: boolean = false;

  const closeModal = () => {
    dispatch('close');
  };

  const handleEdit = () => {
    console.log('[ReservationDetailsActions] Edit clicked');
    dispatch('edit');
  };

  const handleCancel = () => {
    console.log('[ReservationDetailsActions] Cancel clicked');
    dispatch('cancel');
  };
</script>

<div class="modal-actions flex flex-row flex-nowrap items-center justify-end gap-2 p-3 border-t border-slate-200 sm:gap-3 sm:p-6">
  {#if canEdit}
    <button 
      type="button" 
      class="btn btn-secondary btn-sm sm:btn-md" 
      on:click={handleEdit}
    >
      Edit
    </button>
  {/if}
  {#if canCancel}
    <button
      type="button"
      class="btn btn-error btn-sm sm:btn-md"
      on:click={handleCancel}
    >
      Cancel
    </button>
  {/if}
  <button 
    type="button" 
    class="btn btn-primary btn-sm sm:btn-md" 
    on:click={closeModal}
  >
    Close
  </button>
</div>

<style>
  /* Keep the scope minimal; rely on Tailwind/DaisyUI utilities above. */
</style>
