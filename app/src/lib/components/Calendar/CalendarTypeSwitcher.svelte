<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { goto } from '$app/navigation';

  type CalendarType = 'pool' | 'openwater' | 'classroom';
  export let value: CalendarType = 'pool';

  const dispatch = createEventDispatcher<{ change: CalendarType }>();

  // Initialize from URL parameter on mount
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    if (typeParam && ['pool', 'openwater', 'classroom'].includes(typeParam)) {
      value = typeParam as CalendarType;
    }
  });

  function setType(type: CalendarType) {
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
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={value === 'pool'}
    class:text-white={value === 'pool'}
    class:bg-[#00294C]={value === 'pool'}
    class:border-[#00294C]={value === 'pool'}
    class:btn-outline={value !== 'pool'}
    class:active-button={value === 'pool'}
    on:click={() => setType('pool')}
    title="Pool Reservations"
  >
    <span class="font-medium">Pool</span>
  </button>
  <button 
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={value === 'openwater'}
    class:text-white={value === 'openwater'}
    class:bg-[#00294C]={value === 'openwater'}
    class:border-[#00294C]={value === 'openwater'}
    class:btn-outline={value !== 'openwater'}
    class:active-button={value === 'openwater'}
    on:click={() => setType('openwater')}
    title="Open Water Reservations"
  >
    <span class="font-medium">Open Water</span>
  </button>
  <button 
    class="btn btn-sm relative transition-all duration-200"
    class:shadow-lg={value === 'classroom'}
    class:text-white={value === 'classroom'}
    class:bg-[#00294C]={value === 'classroom'}
    class:border-[#00294C]={value === 'classroom'}
    class:btn-outline={value !== 'classroom'}
    class:active-button={value === 'classroom'}
    on:click={() => setType('classroom')}
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
  
  /* Button container with increased vertical padding */
  .button-container {
    padding: 1rem 0;
  }
  
  /* Individual button vertical padding */
  .button-container .btn {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
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
    
    .button-container .btn {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
  }
</style>


