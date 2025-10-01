<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import dayjs from 'dayjs';

  export let selectedDate: string;

  const dispatch = createEventDispatcher();

  function handleBack() {
    dispatch('back');
  }

  function handlePrevDay() {
    const prev = dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD');
    dispatch('changeDate', prev);
  }

  function handleNextDay() {
    const next = dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD');
    dispatch('changeDate', next);
  }

  function formatSelectedDate(date: string) {
    return dayjs(date).format('dddd, MMMM D, YYYY');
  }
</script>

<div class="single-day-header">
  <button class="back-button btn btn-ghost btn-xs" on:click={handleBack}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
    Back
  </button>
  <div class="date-controls">
    <h1 class="single-day-title">{formatSelectedDate(selectedDate)}</h1>
    <button class="nav-button btn btn-outline btn-sm" on:click={handlePrevDay} aria-label="Previous Day">Prev</button>
    <button class="nav-button btn btn-outline btn-sm" on:click={handleNextDay} aria-label="Next Day">Next</button>
  </div>
  
</div>

<style>
  .single-day-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #475569;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .back-button:hover {
    background: #e2e8f0;
    color: #334155;
  }

  .single-day-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .date-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
  }

  /* Mobile: keep date on a single line with ellipsis */
  @media (max-width: 640px) {
    .date-controls {
      flex: 1;
      min-width: 0;
    }
    .single-day-title {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
  }
</style>


