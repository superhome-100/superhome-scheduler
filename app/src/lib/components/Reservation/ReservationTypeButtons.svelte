<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let selectedType: 'pool' | 'openwater' | 'classroom' = 'pool';

  const dispatch = createEventDispatcher();

  const selectType = (type: 'pool' | 'openwater' | 'classroom') => {
    selectedType = type;
    dispatch('typeSelected', { type });
  };
</script>

<!-- Reservation Type Buttons -->
<div class="reservation-type-buttons">
  <button 
    class="type-btn" 
    class:active={selectedType === 'pool'} 
    on:click={() => selectType('pool')}
    title="Pool Reservations"
  >
    <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
    <span class="type-text">Pool</span>
  </button>
  <button 
    class="type-btn" 
    class:active={selectedType === 'openwater'} 
    on:click={() => selectType('openwater')}
    title="Open Water Reservations"
  >
    <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
    <span class="type-text">Open Water</span>
  </button>
  <button 
    class="type-btn" 
    class:active={selectedType === 'classroom'} 
    on:click={() => selectType('classroom')}
    title="Classroom Reservations"
  >
    <svg class="type-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
    <span class="type-text">Classroom</span>
  </button>
</div>

<style>
  /* Reservation Type Buttons */
  .reservation-type-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .type-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 2rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 120px;
  }

  .type-icon {
    flex-shrink: 0;
  }

  .type-text {
    white-space: nowrap;
  }

  .type-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #f8fafc;
  }

  .type-btn.active {
    border-color: #3b82f6;
    background: #3b82f6;
    color: white;
  }

  .type-btn.active:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .reservation-type-buttons {
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }

    .type-btn {
      width: auto;
      min-width: auto;
      padding: 0.75rem;
      border-radius: 50%;
      aspect-ratio: 1;
      justify-content: center;
    }

    .type-text {
      display: none;
    }

    .type-icon {
      width: 24px;
      height: 24px;
    }
  }
</style>
