<script lang="ts">
  import { onMount } from 'svelte';
  import { availabilityService } from '../services/availabilityService';
  import type { ReservationType } from '../services/reservationService';
  import type { AvailabilityCheck } from '../services/availabilityService';

  export let date: string;
  export let resType: ReservationType;
  export let category: string | undefined = undefined;
  export let showDetails = false;

  let availability: AvailabilityCheck | null = null;
  let loading = false;
  let error = '';

  onMount(() => {
    checkAvailability();
  });

  $: if (date && resType) {
    checkAvailability();
  }

  async function checkAvailability() {
    if (!date || !resType) return;

    loading = true;
    error = '';

    try {
      availability = await availabilityService.checkAvailability(date, resType, category);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to check availability';
    } finally {
      loading = false;
    }
  }

  function getStatusClass() {
    if (loading) return 'badge-ghost';
    if (error) return 'badge-warning';
    if (availability?.isAvailable) return 'badge-success';
    return 'badge-error';
  }

  function getStatusText() {
    if (loading) return 'Checking...';
    if (error) return 'Error';
    if (availability?.isAvailable) return 'Available';
    return 'Unavailable';
  }

  function getStatusIcon() {
    if (loading) return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
    if (error) return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    if (availability?.isAvailable) return 'M5 13l4 4L19 7';
    return 'M6 18L18 6M6 6l12 12';
  }
</script>

<div class="availability-indicator">
  <div class="flex items-center gap-2">
    <span class="badge {getStatusClass()} gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getStatusIcon()} />
      </svg>
      {getStatusText()}
    </span>

    {#if showDetails && availability}
      <div class="text-xs text-base-content/70">
        {#if availability.hasOverride}
          <span class="text-warning">Override</span>
        {:else}
          <span class="text-success">Default</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if showDetails && availability && !availability.isAvailable && availability.reason}
    <div class="text-xs text-error mt-1">
      {availability.reason}
    </div>
  {/if}

  {#if error}
    <div class="text-xs text-error mt-1">
      {error}
    </div>
  {/if}
</div>

<style>
  .availability-indicator {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
  }
</style>
