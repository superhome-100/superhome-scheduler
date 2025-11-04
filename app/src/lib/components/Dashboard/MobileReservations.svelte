<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { formatDateForCalendar, formatCompactTime } from '../../utils/dateUtils';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  const dispatch = createEventDispatcher();

  export let upcomingReservations: any[] = [];
  export let completedReservations: any[] = [];
  export let activeMobileTab: 'upcoming' | 'completed' = 'upcoming';
  export let showMobileViewAll = false;
  export let upcomingListEl: HTMLDivElement | null = null;
  export let completedListEl: HTMLDivElement | null = null;
  export let loading = false;
  export let error: string | null = null;

  const handleTabChange = (tab: 'upcoming' | 'completed') => {
    dispatch('tabChange', tab);
  };


  const handleViewAll = () => {
    dispatch('viewAll');
  };

  const handleReservationClick = (reservation: any) => {
    dispatch('reservationClick', reservation);
  };

  const handleNewReservation = () => {
    dispatch('newReservation');
  };


  const getTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      pool: 'Pool',
      open_water: 'Open Water',
      classroom: 'Classroom'
    };
    return typeMap[type] || type;
  };

  const getStatusDisplay = (status: string) => {
    // Return the exact database enum values
    return status || 'pending';
  };

  // Use shared compact time formatter for consistency
  const getCompactTime = (reservation: any): string => formatCompactTime(reservation);
</script>

<!-- Mobile: Tabs container with Upcoming/Completed; View All appears at bottom only when list overflows -->
<div class="mobile-reservations">
  <div class="reservation-section">
    <div class="tabs-row">
      <button 
        class="tab-btn" 
        class:active={activeMobileTab === 'upcoming'}
        on:click={() => handleTabChange('upcoming')}
        aria-pressed={activeMobileTab === 'upcoming'}
      >
        <span>Upcoming</span>
        <span class="indicator" class:active={activeMobileTab === 'upcoming'}></span>
      </button>
      <button 
        class="tab-btn" 
        class:active={activeMobileTab === 'completed'}
        on:click={() => handleTabChange('completed')}
        aria-pressed={activeMobileTab === 'completed'}
      >
        <span>Completed</span>
        <span class="indicator" class:active={activeMobileTab === 'completed'}></span>
      </button>
    </div>

    <div class="reservation-content">
      {#if loading}
        <div class="loading-state">
          <LoadingSpinner size="md" />
          <p>Loading reservations...</p>
        </div>
      {:else if error}
        <div class="error-state">
          <p>Error: {error}</p>
          <button on:click={() => dispatch('retry')}>Retry</button>
        </div>
      {:else if activeMobileTab === 'upcoming'}
        {#if upcomingReservations.length > 0}
          <div class="reservation-list compact mobile-scroll" bind:this={upcomingListEl} on:scroll={() => dispatch('computeOverflow')}>
            {#each upcomingReservations as reservation}
              <div 
                class="reservation-item compact" 
                on:click={() => handleReservationClick(reservation)}
                on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                role="button"
                tabindex="0"
                aria-label="View reservation details"
              >
                <div class="compact-content">
                  <span class="compact-date">{formatDateForCalendar(reservation.res_date)}</span>
                  <span class="compact-time">{getCompactTime(reservation)}</span>
                  <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                    {getTypeDisplay(reservation.res_type)}
                  </span>
                  <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                    {getStatusDisplay(reservation.res_status)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            <p class="empty-text">No upcoming reservations</p>
            <button class="create-first-btn" on:click={handleNewReservation}>Create your first reservation</button>
          </div>
        {/if}
      {:else}
        {#if completedReservations.length > 0}
          <div class="reservation-list compact mobile-scroll" bind:this={completedListEl} on:scroll={() => dispatch('computeOverflow')}>
            {#each completedReservations as reservation}
              <div 
                class="reservation-item compact" 
                on:click={() => handleReservationClick(reservation)}
                on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                role="button"
                tabindex="0"
                aria-label="View reservation details"
              >
                <div class="compact-content">
                  <span class="compact-date">{formatDateForCalendar(reservation.res_date)}</span>
                  <span class="compact-time">{getCompactTime(reservation)}</span>
                  <span class="type-badge compact" class:pool={reservation.res_type === 'pool'} class:openwater={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                    {getTypeDisplay(reservation.res_type)}
                  </span>
                  <span class="status-badge compact" class:confirmed={reservation.res_status === 'confirmed'} class:pending={reservation.res_status === 'pending'} class:rejected={reservation.res_status === 'rejected'}>
                    {getStatusDisplay(reservation.res_status)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <p class="empty-text">No completed reservations</p>
          </div>
        {/if}
      {/if}
    </div>

    {#if showMobileViewAll}
      <div class="mobile-view-all">
        <button class="refresh-btn" on:click={handleViewAll} aria-label="View all">
          View All
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .mobile-reservations {
    display: none; /* Hidden by default, shown on mobile */
  }

  .reservation-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .tabs-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #0f172a;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn.active { 
    background: #3b82f6; 
    border-color: #3b82f6; 
    color: #fff; 
  }

  .indicator { 
    width: 8px; 
    height: 8px; 
    border-radius: 9999px; 
    background: #cbd5e1; 
  }
  .indicator.active { 
    background: #22c55e; 
  }

  .reservation-content { 
    padding: 1rem; 
  }

  .mobile-scroll {
    max-height: calc(70vh - 180px);
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .mobile-view-all {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem 1rem 1rem;
    background: white;
    border-top: 1px solid #e2e8f0;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  .reservation-item.compact {
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
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
    color: #1e293b;
    min-width: 2.5rem;
    flex-shrink: 0;
  }

  .compact-time {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    min-width: 3rem;
    flex-shrink: 0;
  }

  .type-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  .status-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  .type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .type-badge.openwater {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.confirmed {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .status-badge.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .status-badge.rejected {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .create-first-btn {
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-first-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
    gap: 0.5rem;
  }

  .loading-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #e53e3e;
    gap: 0.5rem;
  }

  .error-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-state button {
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .mobile-reservations {
      display: block;
    }

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

    .type-badge.compact {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }

    .status-badge.compact {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }
  }
</style>

