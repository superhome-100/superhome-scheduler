<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ReservationType } from '../../types/reservations';

  export let selectedType: ReservationType = ReservationType.openwater;

  const dispatch = createEventDispatcher<{ typeSelected: { type: ReservationType } }>();

  const selectType = (type: ReservationType) => {
    console.log('ReservationTypeButtons: Selecting type:', type);
    selectedType = type;
    dispatch('typeSelected', { type });
    console.log('ReservationTypeButtons: Dispatched typeSelected event');
  };
</script>

<!-- Reservation Type Buttons -->
<div class="flex justify-center mb-8 flex-wrap gap-6 button-container px-6 sm:px-4">
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={selectedType === ReservationType.pool}
    on:click={() => selectType(ReservationType.pool)}
    title="Pool Reservations"
  >
    Pool
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={selectedType === ReservationType.openwater}
    on:click={() => selectType(ReservationType.openwater)}
    title="Open Water Reservations"
  >
    Open Water
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={selectedType === ReservationType.classroom}
    on:click={() => selectType(ReservationType.classroom)}
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
  }
</style>
