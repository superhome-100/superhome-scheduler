<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const handleNewReservation = () => {
    dispatch('newReservation');
  };
</script>

<!-- Floating Action Button: New Reservation -->
<div class="fixed right-5 bottom-5 z-50 pointer-events-none" aria-hidden="false">
  <button 
    class="btn btn-primary btn-circle shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 active:translate-y-0 pointer-events-auto md:btn-lg md:rounded-full md:px-6 md:gap-2" 
    on:click={handleNewReservation}
    aria-label="Add new reservation"
    title="Add new reservation"
  >
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
    <span class="hidden md:inline font-semibold">New Reservation</span>
  </button>
</div>

