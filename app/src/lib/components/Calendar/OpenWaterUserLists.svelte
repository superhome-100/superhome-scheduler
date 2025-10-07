<script lang="ts">
  import { formatDateForCalendar } from '../../utils/dateUtils';
  import { getOpenWaterTypeDisplay } from '../Reservation/reservationUtils';

  export let filteredReservations: any[];
  export let findAssignment: (uid: string, period: 'AM' | 'PM') => { buoy: string; boat: string };
  export let loadingMyAssignments: boolean;
  export let onShowReservationDetails: (res: any) => void;
</script>

<div class="reservation-columns">
<div class="reservation-table">
  <h3>AM Reservations</h3>
  {#if loadingMyAssignments}
    <div class="loading">Loading assignments...</div>
  {:else if filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'AM').length > 0}
    <div class="reservation-list compact">
      {#each filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'AM') as res (res.uid)}
        <div
          class="reservation-item compact"
          on:click={() => onShowReservationDetails(res)}
          on:keydown={(e) => e.key === 'Enter' && onShowReservationDetails(res)}
          role="button"
          tabindex="0"
          aria-label="View reservation details"
        >
          <div class="compact-content">
            <span class="compact-date">{formatDateForCalendar(res.res_date)}</span>
            <span class="compact-time">{res?.time_period || 'AM'}</span>
            <span class="compact-assignment">
              {findAssignment(res.uid, 'AM').buoy} {findAssignment(res.uid, 'AM').boat}
            </span>
            <span class="type-badge compact openwater">
              {getOpenWaterTypeDisplay(res?.open_water_type)}
            </span>
            <span class="status-badge compact" class:confirmed={res.res_status === 'confirmed'} class:pending={res.res_status === 'pending'} class:rejected={res.res_status === 'rejected'}>
              {res.res_status || 'pending'}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p class="empty-text">No AM reservations</p>
    </div>
  {/if}
 </div>

 <div class="reservation-table">
  <h3>PM Reservations</h3>
  {#if loadingMyAssignments}
    <div class="loading">Loading assignments...</div>
  {:else if filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'PM').length > 0}
    <div class="reservation-list compact">
      {#each filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'PM') as res (res.uid)}
        <div
          class="reservation-item compact"
          on:click={() => onShowReservationDetails(res)}
          on:keydown={(e) => e.key === 'Enter' && onShowReservationDetails(res)}
          role="button"
          tabindex="0"
          aria-label="View reservation details"
        >
          <div class="compact-content">
            <span class="compact-date">{formatDateForCalendar(res.res_date)}</span>
            <span class="compact-time">{res?.time_period || 'PM'}</span>
            <span class="compact-assignment">
              {findAssignment(res.uid, 'PM').buoy} {findAssignment(res.uid, 'PM').boat}
            </span>
            <span class="type-badge compact openwater">
              {getOpenWaterTypeDisplay(res?.open_water_type)}
            </span>
            <span class="status-badge compact" class:confirmed={res.res_status === 'confirmed'} class:pending={res.res_status === 'pending'} class:rejected={res.res_status === 'rejected'}>
              {res.res_status || 'pending'}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p class="empty-text">No PM reservations</p>
    </div>
  {/if}
 </div>
</div>


<style>
  .reservation-table {
    padding: 1rem;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .reservation-table h3 {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reservation-list.compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
    width: 100%;
    align-items: center;
  }

  .reservation-columns {
    display: contents;
  }

  .reservation-table {
    padding: 1rem;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    min-height: 200px;
  }

  @media (min-width: 768px) {
    .reservation-table {
      max-width: 450px;
    }
  }

  @media (min-width: 1024px) {
    .reservation-table {
      max-width: 500px;
    }
  }

  .reservation-item.compact {
    padding: 0.75rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100%;
    max-width: 400px;
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
    min-width: 2rem;
    flex-shrink: 0;
  }

  .compact-assignment {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
    min-width: 6rem;
    flex-shrink: 0;
  }

  .type-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-badge.openwater {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.compact {
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
    border-radius: 12px;
    font-weight: 600;
  }

  .status-badge.confirmed {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.rejected {
    background: #fecaca;
    color: #991b1b;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #64748b;
  }

  .empty-text {
    margin: 0;
    font-size: 0.875rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #64748b;
    font-size: 0.875rem;
  }
</style>
