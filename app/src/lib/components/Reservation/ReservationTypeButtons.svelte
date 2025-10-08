<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';

  const dispatch = createEventDispatcher();

  const selectType = (type: 'pool' | 'openwater' | 'classroom') => {
    console.log('ReservationTypeButtons: Selecting type:', type);
    selectedType = type;
    dispatch('typeSelected', { type });
    console.log('ReservationTypeButtons: Dispatched typeSelected event');
  };
</script>

<!-- Reservation Type Buttons -->
<div class="flex justify-center mb-8 flex-wrap gap-6 button-container px-6 sm:px-4">
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
    <span class="font-medium" style="color: {selectedType === 'pool' ? 'white' : 'inherit'};">Pool</span>
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
    <span class="font-medium" style="color: {selectedType === 'openwater' ? 'white' : 'inherit'};">Open Water</span>
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
    <span class="font-medium" style="color: {selectedType === 'classroom' ? 'white' : 'inherit'};">Classroom</span>
  </button>
</div>

