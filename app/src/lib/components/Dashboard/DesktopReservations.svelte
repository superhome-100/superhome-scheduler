<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // Reservation item formatting is handled inside ReservationCard
  import ReservationCard from '../ReservationCard/ReservationCard.svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import GroupedCompletedList from '../ReservationTotals/GroupedCompletedList.svelte';

  export let upcomingReservations: any[] = [];
  export let completedReservations: any[] = [];
  export let monthlyTotals: Record<string, number> = {};
  export let loading = false;
  export let error: string | null = null;

  const dispatch = createEventDispatcher();


  const handleViewAllUpcoming = () => {
    dispatch('viewAllUpcoming');
  };

  const handleViewAllCompleted = () => {
    dispatch('viewAllCompleted');
  };

  const handleReservationClick = (reservation: any) => {
    console.log('DesktopReservations: Main dashboard reservation clicked:', reservation);
    console.log('DesktopReservations: Reservation fields:', Object.keys(reservation));
    // Ensure the event is properly dispatched with the reservation data
    dispatch('reservationClick', reservation);
  };

  const handleNewReservation = () => {
    dispatch('newReservation');
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
            <ReservationCard reservation={reservation} showPrice={false} on:click={() => handleReservationClick(reservation)} />
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
          <GroupedCompletedList
            reservations={completedReservations}
            monthlyTotals={monthlyTotals}
            limit={2}
            on:reservationClick={(e) => handleReservationClick(e.detail)}
          />
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
    padding: 1.5rem 2rem 1rem 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    padding-left: 0.5rem;
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
    padding: 2rem;
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

  /* Compact reservation styles */
  .reservation-list.compact {
    gap: 0.75rem;
    max-height: 240px; /* Approximately 3 items * 80px height */
    overflow-y: auto;
  }

  /* Reservation List */
  .reservation-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .reservations-container {
      display: none; /* Hide on mobile, show mobile version instead */
    }
  }
</style>


