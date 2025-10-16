<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ReservationType } from '../../types/reservations';

  export let selectedType: ReservationType = ReservationType.pool;

  const dispatch = createEventDispatcher<{ typeSelected: { type: ReservationType } }>();

  // Initialize from URL parameter on mount
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const validTypes = Object.values(ReservationType) as string[];
    if (typeParam && validTypes.includes(typeParam)) {
      selectedType = typeParam as ReservationType;
    }
  });

  const selectType = (type: ReservationType) => {
    selectedType = type;
    
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('type', type);
    goto(url.toString(), { replaceState: true, noScroll: true });
    
    dispatch('typeSelected', { type });
  };
</script>

<!-- Admin Calendar Type Buttons -->
<div class="flex justify-center mb-8 flex-wrap gap-6">
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
