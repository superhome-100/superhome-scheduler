<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getTimeUntilCutoff, getCutoffDescription } from '../utils/cutoffRules';
  import type { ReservationType } from '../services/reservationService';

  export let reservationDate: string;
  export let resType: ReservationType;
  export let startTime: string = '';
  export let showWarning = true;

  let timeRemaining = { hours: 0, minutes: 0, totalMinutes: 0 };
  let intervalId: number;

  // Single reactive statement that handles all updates
  $: {
    if (reservationDate && resType) {
      timeRemaining = getTimeUntilCutoff(reservationDate, resType, startTime);
    }
  }

  onMount(() => {
    // Update every minute
    intervalId = setInterval(() => {
      if (reservationDate && resType) {
        timeRemaining = getTimeUntilCutoff(reservationDate, resType, startTime);
      }
    }, 60000);
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  // Reactive time display
  $: timeDisplay = (() => {
    if (timeRemaining.totalMinutes <= 0) {
      return 'Cut-off time has passed';
    }
    // Do not show remaining time for any type; only show message when cutoff has passed
    return null;
  })();

  // Reactive warning level: only show when cutoff has passed
  $: warningLevel = (() => {
    if (timeRemaining.totalMinutes <= 0) {
      return 'error';
    }
    return null; // No alert before cutoff for any type
  })();

  // Reactive warning icon
  $: warningIcon = (() => {
    if (warningLevel === 'error') {
      return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z';
    } else if (warningLevel === 'warning') {
      return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    } else {
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  })();
</script>

<style>
  .compact-alert {
    padding: 0;
    font-size: 0.875rem;
  }

  .alert-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alert-text {
    flex: 1;
    line-height: 1.3;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .compact-alert {
      padding: 0;
      font-size: 0.8125rem;
    }

    .alert-content {
      gap: 0.375rem;
    }
  }
</style>

{#if showWarning && reservationDate && resType && warningLevel}
  <div class="alert alert-{warningLevel} mb-3 compact-alert">
    <div class="alert-content">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={warningIcon} />
      </svg>
      <div class="alert-text">
        {#if timeDisplay}
          <span class="font-medium text-sm">{timeDisplay}</span>
        {/if}
      </div>
    </div>
  </div>
{/if}
