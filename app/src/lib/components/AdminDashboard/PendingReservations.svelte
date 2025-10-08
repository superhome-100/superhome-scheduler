  <script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import LoadingSpinner from '../LoadingSpinner.svelte';
    import { getTypeDisplay } from '../../utils/reservationTransform';
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

  <div class="card bg-base-100 shadow-sm border border-base-300 rounded-xl p-6 mb-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-[#00294C] flex items-center gap-2">
        Pending Reservation Requests 
        <div class="badge badge-error text-white font-bold text-base min-w-8 h-8 px-3 shadow-sm">
          {stats.pendingReservations}
        </div>
      </h2>
      <button class="btn btn-ghost btn-sm gap-2 text-[#00294C] hover:text-[#00294C]" on:click={handleRefresh}>
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
          <div class="flex items-center justify-between py-3 border-b border-base-300 last:border-b-0 gap-3 min-h-[60px] rounded-xl m-2 p-2">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <div class="font-semibold text-[#00294C] text-sm truncate">
                {reservation.user_profiles?.name || 'Unknown User'}
              </div>
              <div class="flex items-center gap-2 text-xs text-[#00294C]">
                <span class="badge badge-sm text-[#00294C]" class:badge-primary={reservation.res_type === 'pool'} class:badge-success={reservation.res_type === 'open_water'} class:badge-error={reservation.res_type === 'classroom'}>
                  {getTypeDisplay(reservation.res_type)}
                </span>
                <span>{dayjs(reservation.res_date).format('MMM D, YYYY')}</span>
              </div>
            </div>
            <div class="flex-shrink-0 ml-2">
              <button class="btn btn-primary btn-sm font-medium whitespace-nowrap" style="color: #00294C !important;" on:click={() => openReservationDetails(reservation)}>
                View Details
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Desktop grid -->
      <div class="reservations-grid p-4">
        {#each pendingReservations as reservation}
          <div class="card bg-base-50 border border-base-300 rounded-xl p-6 hover:border-primary hover:shadow-lg transition-all duration-200 flex-shrink-0 m-1">
            <div class="card-header flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div class="flex flex-col gap-1">
                  <span class="font-semibold text-[#00294C] text-sm">
                    {reservation.user_profiles?.name || 'Unknown User'}
                  </span>
                  <span class="badge badge-sm text-[#00294C]" class:badge-primary={reservation.res_type === 'pool'} class:badge-success={reservation.res_type === 'open_water'} class:badge-error={reservation.res_type === 'classroom'}>
                    {getTypeDisplay(reservation.res_type)}
                  </span>
                </div>
              </div>
              <div class="text-sm text-[#00294C] font-medium">
                {dayjs(reservation.res_date).format('MMM D, YYYY')}
              </div>
            </div>
            
            <div class="card-body p-0 mb-4 flex-1 flex flex-col">
              {#if reservation.title}
                <h4 class="text-sm font-semibold text-[#00294C] mb-2 line-clamp-2">{reservation.title}</h4>
              {/if}
              {#if reservation.description}
                <p class="text-xs text-[#00294C] leading-relaxed mb-3 line-clamp-3 flex-1">{reservation.description}</p>
              {/if}
              <div class="flex gap-4 flex-wrap mt-auto">
                <span class="flex items-center gap-1 text-xs text-[#00294C]">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  Requested {dayjs(reservation.created_at).format('MMM D, YYYY')}
                </span>
              </div>
            </div>
            
            <div class="card-actions grid grid-cols-2 gap-2 mt-auto">
              <button 
                class="btn btn-xs gap-1 w-full"
                style="background-color: #dc3545 !important; border-color: #dc3545 !important; color: white !important;"
                on:click={() => handleReservationAction(reservation, 'reject')}
                disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
                title="Reject reservation"
              >
                {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                  <LoadingSpinner size="sm" />
                {:else}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Reject
                {/if}
              </button>
              <button 
                class="btn btn-xs gap-1 w-full"
                style="background-color: #28a745 !important; border-color: #28a745 !important; color: white !important;"
                on:click={() => handleReservationAction(reservation, 'approve')}
                disabled={processingReservation === `${reservation.uid}-${reservation.res_date}`}
                title="Approve reservation"
              >
                {#if processingReservation === `${reservation.uid}-${reservation.res_date}`}
                  <LoadingSpinner size="sm" />
                {:else}
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
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
      <div class="flex flex-col items-center justify-center py-12 text-[#00294C] text-center">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" class="text-[#00294C] mb-4">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
        <p class="text-sm text-[#00294C]">No pending reservation requests</p>
      </div>
    {/if}
  </div>

  <style>
    /* Mobile compact list - hidden by default, shown on mobile */
    .pending-mobile { 
      display: none; 
    }
    
    /* Desktop grid with horizontal scroll */
    .reservations-grid {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 1rem 0.5rem 1rem 1rem;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior-x: contain;
      max-width: 100%;
    }

    /* Responsive card sizing */
    .reservations-grid .card {
      flex: 0 0 auto;
      min-width: 280px;
      max-width: 320px;
      width: clamp(280px, 25vw, 320px);
      height: 220px;
      scroll-snap-align: start;
      margin: 0.25rem 0.25rem 0.25rem 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 2px solid #00294C;
      position: relative;
    }

    /* Ensure outlines are always visible for mobile */
    .pending-mobile > div {
      position: relative;
      z-index: 1;
      border: 2px solid #00294C;
      border-radius: 0.75rem; /* rounded-xl */
    }
    
    .pending-mobile > div::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border: 1px solid #00294C;
      border-radius: 0.75rem; /* rounded-xl to match the main border */
      z-index: -1;
      pointer-events: none;
    }

    /* Text truncation utilities */
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Mobile responsive behavior */
    @media (max-width: 768px) {
      .pending-mobile { 
        display: block; 
        padding: 0.5rem;
      }
      
      .pending-mobile.scrollable {
        max-height: 320px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 0.5rem;
      }
      
      .reservations-grid { 
        display: none; 
      }
    }

    /* Ensure first card is not cut off */
    .reservations-grid .card:first-child {
      margin-left: 0.5rem;
    }
  </style>
