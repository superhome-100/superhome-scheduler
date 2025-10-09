<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  export let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';

  const dispatch = createEventDispatcher();

  // Initialize from URL parameter on mount
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam && ['pool', 'openwater', 'classroom'].includes(typeParam)) {
      selectedType = typeParam as 'pool' | 'openwater' | 'classroom';
    }
  });

  const selectType = (type: 'pool' | 'openwater' | 'classroom') => {
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
    class:btn-active={selectedType === 'pool'}
    on:click={() => selectType('pool')}
    title="Pool Reservations"
  >
    Pool
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={selectedType === 'openwater'}
    on:click={() => selectType('openwater')}
    title="Open Water Reservations"
  >
    Open Water
  </button>
  <button 
    class="btn btn-sm btn-outline"
    class:btn-active={selectedType === 'classroom'}
    on:click={() => selectType('classroom')}
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
