<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';

  export let upcomingReservations: any[] = [];
  export let completedReservations: any[] = [];
  export let loading = false;
  export let error: string | null = null;

  const dispatch = createEventDispatcher();

  const handleReservationClick = (reservation: any) => {
    console.log('DesktopReservations: Main dashboard reservation clicked:', reservation);
    console.log('DesktopReservations: Reservation fields:', Object.keys(reservation));
    // Ensure the event is properly dispatched with the reservation data
    dispatch('reservationClick', reservation);
  };

  const handleViewAllUpcoming = () => {
    dispatch('viewAllUpcoming');
  };

  const handleViewAllCompleted = () => {
    dispatch('viewAllCompleted');
  };

  const handleNewReservation = () => {
    dispatch('newReservation');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
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
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      rejected: 'Rejected'
    };
    return statusMap[status] || status;
  };
</script>

<!-- Reservations Sections -->
<div class="reservations-container">
  <!-- Upcoming Reservations -->
  <div class="reservation-section">
    <div class="section-header">
      <h2 class="section-title">Upcoming Reservations</h2>
      <button class="refresh-btn" on:click={handleViewAllUpcoming}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
        View All
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
      {:else if upcomingReservations.length > 0}
        <div class="reservation-list compact">
          {#each upcomingReservations.slice(0, 3) as reservation}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
              class="reservation-item compact" 
              on:click={() => handleReservationClick(reservation)}
              role="button"
              tabindex="0"
              aria-label="View reservation details"
            >
              <div class="compact-content">
                <span class="compact-date">{formatDate(reservation.res_date)}</span>
                <span class="compact-time">{formatTime(reservation.res_date)}</span>
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
    </div>
  </div>

  <!-- Completed Reservations -->
  <div class="reservation-section">
    <div class="section-header">
      <h2 class="section-title">Completed Reservations</h2>
      <button class="refresh-btn" on:click={handleViewAllCompleted}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
        View All
      </button>
    </div>
    <div class="reservation-content">
      {#if loading}
        <div class="loading-state">
          <LoadingSpinner size="md" />
          <p>Loading reservations...</p>
        </div>
      {:else if completedReservations.length > 0}
        <div class="reservation-list compact">
          {#each completedReservations.slice(0, 2) as reservation}
            <div 
              class="reservation-item compact" 
              on:click={() => handleReservationClick(reservation)}
              on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
              role="button"
              tabindex="0"
              aria-label="View reservation details"
            >
              <div class="compact-content">
                <span class="compact-date">{formatDate(reservation.res_date)}</span>
                <span class="compact-time">{formatTime(reservation.res_date)}</span>
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
    </div>
  </div>
</div>

<style>
  /* Reservations Container */
  .reservations-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    width: 100%;
  }

  /* Reservation Section */
  .reservation-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
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

  .reservation-content {
    padding: 1.5rem;
    min-height: 200px;
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
    color: white;
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

  /* Compact reservation styles */
  .reservation-list.compact {
    gap: 0.5rem;
    max-height: 240px; /* Approximately 3 items * 80px height */
    overflow-y: auto;
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
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .compact-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    min-width: 3rem;
  }

  .compact-time {
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
    min-width: 4rem;
  }

  .type-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  .status-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
  }

  /* Reservation List */
  .reservation-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .reservations-container {
      display: none; /* Hide on mobile, show mobile version instead */
    }
  }
</style>
