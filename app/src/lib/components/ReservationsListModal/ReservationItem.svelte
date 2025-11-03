<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationBadges from './ReservationBadges.svelte';

  export let reservation: any;
  export let showDetails: boolean = false;

  const dispatch = createEventDispatcher();

  const handleReservationClick = () => {
    if (showDetails) {
      dispatch('reservationClick', reservation);
    }
  };

  // For Open Water, hide numeric time and show only AM/PM
  const getReservationTimeDisplay = (r: any): string => {
    if (r?.type === 'Open Water') {
      if (r?.period) return String(r.period).toUpperCase();
      if (r?.startTime) {
        const match = String(r.startTime).match(/\b(AM|PM)\b/i);
        return match ? match[0].toUpperCase() : '';
      }
      return '';
    }
    return r?.startTime ?? '';
  };
</script>

<div 
  class="reservation-item compact" 
  class:clickable={showDetails} 
  on:click={handleReservationClick} 
  role={showDetails ? "button" : ""} 
  {...(showDetails ? { tabindex: 0 } : {})} 
  on:keydown={(e) => showDetails && e.key === 'Enter' && handleReservationClick()}
>
  <div class="compact-content">
    <span class="compact-date">{new Date(reservation.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    <span class="compact-time">{getReservationTimeDisplay(reservation)}</span>
    <ReservationBadges {reservation} compact={true} />
  </div>
</div>

<style>
  .reservation-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .reservation-item.compact {
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reservation-item.compact:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .compact-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  .compact-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    min-width: 2.5rem;
    flex-shrink: 0;
  }

  .compact-time {
    font-size: 0.875rem;
    color: #64748b;
    min-width: 3rem;
    flex-shrink: 0;
  }

  .reservation-item:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  .reservation-item.clickable {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reservation-item.clickable:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .reservation-item.clickable:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .compact-content {
      gap: 0.375rem;
    }

    .compact-date {
      font-size: 0.8125rem;
      min-width: 2rem;
    }

    .compact-time {
      font-size: 0.8125rem;
      min-width: 2.5rem;
    }
  }
</style>
