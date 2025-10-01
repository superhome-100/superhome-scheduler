<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '../LoadingSpinner.svelte';
  import { getTypeDisplay } from './adminUtils';
  import dayjs from 'dayjs';

  const dispatch = createEventDispatcher();

  export let pendingReservations: any[] = [];
  export let stats: any = {};
  export let processingReservation: string | null = null;

  const handleRefresh = () => {
    dispatch('refresh');
  };

  const handleReservationAction = (reservation: any, action: 'approve' | 'reject') => {
    dispatch('reservationAction', { reservation, action });
  };

  const openReservationDetails = (reservation: any) => {
    dispatch('openReservationDetails', reservation);
  };

</script>

<div class="section">
  <div class="section-header">
    <h2>Pending Reservation Requests <span class="badge">{stats.pendingReservations}</span></h2>
    <button class="refresh-btn" on:click={handleRefresh}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
      Refresh
    </button>
  </div>
  
  {#if pendingReservations.length > 0}
    <!-- Mobile compact list -->
    <div class="pending-mobile" class:scrollable={pendingReservations.length > 5}>
      {#each pendingReservations as reservation}
        <div class="pending-item">
          <div class="pi-left">
            <div class="pi-name">{reservation.user_profiles?.name || 'Unknown User'}</div>
            <div class="pi-meta">
              <span class="reservation-type-badge" class:pool={reservation.res_type === 'pool'} class:open-water={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                {getTypeDisplay(reservation.res_type)}
              </span>
              <span class="pi-date">{dayjs(reservation.res_date).format('MMM D, YYYY')}</span>
            </div>
          </div>
          <div class="pi-actions">
            <button class="view-btn" on:click={() => openReservationDetails(reservation)}>View Details</button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Desktop grid -->
    <div class="reservations-grid">
      {#each pendingReservations as reservation}
        <div class="reservation-card">
          <div class="reservation-card-header">
            <div class="user-info">
              <div class="user-avatar">
                {reservation.user_profiles?.name?.charAt(0) || 'U'}
              </div>
              <div class="user-details">
                <span class="user-name">{reservation.user_profiles?.name || 'Unknown User'}</span>
                <span class="reservation-type-badge" class:pool={reservation.res_type === 'pool'} class:open-water={reservation.res_type === 'open_water'} class:classroom={reservation.res_type === 'classroom'}>
                  {getTypeDisplay(reservation.res_type)}
                </span>
              </div>
            </div>
            <div class="reservation-date">
              {dayjs(reservation.res_date).format('MMM D, YYYY')}
            </div>
          </div>
          
          <div class="reservation-card-body">
            {#if reservation.title}
              <h4 class="reservation-title">{reservation.title}</h4>
            {/if}
            {#if reservation.description}
              <p class="reservation-description">{reservation.description}</p>
            {/if}
            <div class="reservation-meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                Requested {dayjs(reservation.created_at).format('MMM D, YYYY')}
              </span>
            </div>
          </div>
          
          <div class="reservation-card-actions">
            <button 
              class="action-btn reject"
              on:click={() => handleReservationAction(reservation, 'reject')}
              disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
              title="Reject reservation"
            >
              {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                <LoadingSpinner size="sm" />
              {:else}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                Reject
              {/if}
            </button>
            <button 
              class="action-btn approve"
              on:click={() => handleReservationAction(reservation, 'approve')}
              disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
              title="Approve reservation"
            >
              {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                <LoadingSpinner size="sm" />
              {:else}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                Approve
              {/if}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-reservations">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
      </svg>
      <p>No pending reservation requests</p>
    </div>
  {/if}
</div>

<style>
  .section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.6rem;
    margin-left: 0.5rem;
    border-radius: 9999px;
    background: #ef4444;
    color: #fff;
    font-size: 1rem;
    line-height: 1;
    font-weight: 800;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.1);
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
  }

  .refresh-btn:hover {
    background: #e2e8f0;
  }

  /* Mobile compact list */
  .pending-mobile { 
    display: none; 
  }
  
  .pending-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e5e7eb;
    gap: 0.75rem;
  }
  
  .pending-item:last-child { 
    border-bottom: none; 
  }
  
  .pi-left { 
    display: flex; 
    flex-direction: column; 
    gap: 0.25rem; 
    min-width: 0; 
  }
  
  .pi-name { 
    font-weight: 600; 
    color: #0f172a; 
    font-size: 0.95rem; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    white-space: nowrap; 
  }
  
  .pi-meta { 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; 
    color: #64748b; 
    font-size: 0.8rem; 
  }
  
  .pi-date { 
    color: #64748b; 
  }
  
  .view-btn { 
    background: #3b82f6; 
    color: white; 
    border: none; 
    padding: 0.5rem 0.75rem; 
    border-radius: 8px; 
    font-size: 0.85rem; 
    cursor: pointer;
  }

  /* Desktop grid */
  .reservations-grid {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    max-width: 100%;
  }

  .reservation-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    background: #fafbfc;
    transition: all 0.2s ease;
    flex: 0 0 calc(25% - 0.75rem);
    min-width: 240px;
    scroll-snap-align: start;
  }

  .reservation-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  }

  .reservation-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-name {
    font-weight: 600;
    color: #1e293b;
    font-size: 0.875rem;
  }

  .reservation-type-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reservation-type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .reservation-type-badge.open-water {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .reservation-type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .reservation-date {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .reservation-card-body {
    margin-bottom: 1.5rem;
  }

  .reservation-title {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .reservation-description {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 1rem 0;
  }

  .reservation-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .reservation-card-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn.approve {
    background: #10b981;
    color: white;
    border: 1px solid #10b981;
  }

  .action-btn.approve:hover:not(:disabled) {
    background: #059669;
    border-color: #059669;
  }

  .action-btn.reject {
    background: #ef4444;
    color: white;
    border: 1px solid #ef4444;
  }

  .action-btn.reject:hover:not(:disabled) {
    background: #dc2626;
    border-color: #dc2626;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty-reservations {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: #64748b;
    text-align: center;
  }

  .empty-reservations svg {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-reservations p {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Responsive breakpoints */
  @media (max-width: 1400px) {
    .reservation-card { flex-basis: calc(33.333% - 0.75rem); }
  }
  
  @media (max-width: 1100px) {
    .reservation-card { flex-basis: calc(50% - 0.75rem); }
  }

  @media (max-width: 768px) {
    .pending-mobile { 
      display: block; 
    }
    
    .pending-mobile.scrollable {
      max-height: 320px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-right: 2px;
    }
    
    .reservations-grid { 
      display: none; 
    }
  }
</style>
