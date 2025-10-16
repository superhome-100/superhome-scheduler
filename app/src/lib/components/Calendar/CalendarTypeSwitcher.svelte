<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  import { ReservationType } from '../../types/reservations';

  export let value: ReservationType = ReservationType.pool;

  const dispatch = createEventDispatcher<{ change: ReservationType }>();

  // Value is controlled by parent component
  // No need to initialize from URL parameter here

  function setType(type: ReservationType) {
    if (value !== type) {
      value = type;
      
      // Update URL parameter
      const url = new URL(window.location.href);
      url.searchParams.set('type', type);
      goto(url.toString(), { replaceState: true, noScroll: true });
      
      dispatch('change', value);
    }
  }
</script>

<!-- Calendar Type Buttons -->
<div class="flex justify-center mb-8 flex-wrap gap-6 button-container px-6 sm:px-4">
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={value === ReservationType.pool}
    on:click={() => setType(ReservationType.pool)}
    title="Pool Reservations"
  >
    Pool
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={value === ReservationType.openwater}
    on:click={() => setType(ReservationType.openwater)}
    title="Open Water Reservations"
  >
    Open Water
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={value === ReservationType.classroom}
    on:click={() => setType(ReservationType.classroom)}
    title="Classroom Reservations"
  >
    Classroom
  </button>
</div>

<style>
  /* Smooth transitions for better UX */
  .btn {
    transition: all 0.2s ease-in-out;
  }
  
  /* Custom active button styling with distinct color */
  .btn-active {
    background-color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
  }
  
  .btn-active:hover {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
  }
  
  /* Button container with increased vertical padding */
  .button-container {
    padding: 1rem 0;
  }
  
  /* Mobile Responsive - Keep buttons compact on mobile */
  @media (max-width: 768px) {
    .btn {
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
    }
    
    /* Reduce gap on mobile */
    .flex.gap-6 {
      gap: 0.5rem !important;
    }
    
    /* Adjust vertical padding for mobile */
    .button-container {
      padding: 0.5rem 0;
    }
  }
</style>


