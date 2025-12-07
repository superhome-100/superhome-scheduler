<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import dayjs from 'dayjs';

  export let selectedDate: string;
  export let showListButton: boolean = false;

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

  function handleOpenList() {
    dispatch('openList');
  }

  function formatSelectedDate(date: string) {
    return dayjs(date).format('dddd, MMMM D, YYYY');
  }
</script>

<div class="bg-white border-b border-slate-200 p-4 flex items-center gap-4 sticky top-0 z-10">
  <button class="btn btn-ghost btn-sm flex items-center gap-2 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-200 hover:text-slate-700 transition-all duration-200" on:click={handleBack}>
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
    </svg>
    Back
  </button>
  <div class="flex items-center gap-3 ml-auto sm:flex-1 sm:min-w-0">
    <h1 class="date-title text-xl font-semibold text-slate-800 m-0 sm:whitespace-nowrap sm:overflow-hidden sm:text-ellipsis sm:flex-1">{formatSelectedDate(selectedDate)}</h1>
    {#if showListButton}
      <button
        class="btn btn-ghost btn-sm px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-700 transition-all duration-200"
        type="button"
        on:click={handleOpenList}
        aria-label="Show reservations list"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
        </svg>
      </button>
    {/if}
    <div class="nav-buttons">
      <button class="btn btn-outline btn-sm" on:click={handlePrevDay} aria-label="Previous Day">Prev</button>
      <button class="btn btn-outline btn-sm" on:click={handleNextDay} aria-label="Next Day">Next</button>
    </div>
  </div>
</div>

<style>
  .date-title {
    font-size: 1rem; /* Smaller than the default text-xl (1.25rem) */
  }
  
  .nav-buttons {
    margin-left: 1rem; /* Add margin gap between date and buttons */
    display: flex;
    gap: 0.5rem; /* Gap between Prev and Next buttons */
  }
  
  /* Even smaller on mobile for better space utilization */
  @media (max-width: 640px) {
    .date-title {
      font-size: 0.875rem; /* text-sm equivalent */
    }
    
    .nav-buttons {
      margin-left: 0.75rem; /* Slightly smaller gap on mobile */
    }
  }
</style>
