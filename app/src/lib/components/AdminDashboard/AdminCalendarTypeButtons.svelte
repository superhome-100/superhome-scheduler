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
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={selectedType === 'pool'}
    class:text-white={selectedType === 'pool'}
    class:bg-[#00294C]={selectedType === 'pool'}
    class:border-[#00294C]={selectedType === 'pool'}
    class:btn-outline={selectedType !== 'pool'}
    class:active-button={selectedType === 'pool'}
    on:click={() => selectType('pool')}
    title="Pool Reservations"
  >
    <span class="font-medium">Pool</span>
  </button>
  <button 
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={selectedType === 'openwater'}
    class:text-white={selectedType === 'openwater'}
    class:bg-[#00294C]={selectedType === 'openwater'}
    class:border-[#00294C]={selectedType === 'openwater'}
    class:btn-outline={selectedType !== 'openwater'}
    class:active-button={selectedType === 'openwater'}
    on:click={() => selectType('openwater')}
    title="Open Water Reservations"
  >
    <span class="font-medium">Open Water</span>
  </button>
  <button 
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={selectedType === 'classroom'}
    class:text-white={selectedType === 'classroom'}
    class:bg-[#00294C]={selectedType === 'classroom'}
    class:border-[#00294C]={selectedType === 'classroom'}
    class:btn-outline={selectedType !== 'classroom'}
    class:active-button={selectedType === 'classroom'}
    on:click={() => selectType('classroom')}
    title="Classroom Reservations"
  >
    <span class="font-medium">Classroom</span>
  </button>
</div>

<style>
  /* Smooth transitions for better UX */
  .btn {
    transition: all 0.2s ease-in-out;
  }
  
  /* Force white text on active buttons */
  .active-button {
    color: white !important;
  }
  
  .active-button span {
    color: white !important;
  }
  
  /* Ensure proper spacing between buttons */
  .flex.gap-6 > * + * {
    margin-left: 0.5rem !important;
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
