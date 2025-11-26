<script lang="ts">
  import { formatDateForCalendar } from '../../../../utils/dateUtils';
  import { getOpenWaterTypeDisplay } from '../../../Reservation/reservationUtils';
  import OpenWaterUserTable from './OpenWaterUserTable.svelte';
  import type { OpenWaterReservationView } from '../../../../types/reservationViews';

  export let filteredReservations: OpenWaterReservationView[];
  export let findAssignment: (uid: string, period: 'AM' | 'PM') => { buoy: string; boat: string };
  export let onShowReservationDetails: (res: OpenWaterReservationView) => void;
  // When 0, parent hasn't completed initial assignment loads yet
  export let assignmentVersion: number = 0;
</script>

<div class="reservation-columns">
<div class="reservation-table">
  <h3>AM Reservations</h3>
  <!-- Tabular alignment under AM heading -->
  <OpenWaterUserTable
    {filteredReservations}
    findAssignment={findAssignment}
    assignmentVersion={assignmentVersion}
    onShowReservationDetails={onShowReservationDetails}
    timePeriod="AM"
  />
  {#if filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'AM').length > 0}
    <div class="reservation-list compact">
      {#each filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'AM') as res (res.uid)}
        <div
          class="reservation-item compact"
          class:status-confirmed={res.res_status === 'confirmed'}
          class:status-pending={res.res_status === 'pending'}
          class:status-rejected={res.res_status === 'rejected'}
          on:click={() => onShowReservationDetails(res)}
          on:keydown={(e) => e.key === 'Enter' && onShowReservationDetails(res)}
          role="button"
          tabindex="0"
          aria-label="View reservation details"
        >
            <div class="compact-content">
              <span class="compact-time">{res?.time_period || 'AM'}</span>
              {#key `${res.uid}-AM-${assignmentVersion}`}
                {#if (() => { const a = findAssignment(res.uid, 'AM'); return !(a.buoy === 'Not assigned' && a.boat === 'Not assigned' && assignmentVersion === 0); })()}
                  {#await Promise.resolve(findAssignment(res.uid, 'AM')) then a}
                    <span class="compact-buoy">{a.buoy}</span>
                    <span class="compact-boat">{a.boat}</span>
                  {/await}
                {/if}
              {/key}
              <span class="type-badge compact openwater">
                {getOpenWaterTypeDisplay(res?.open_water_type)}
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
  <!-- Tabular alignment under PM heading -->
  <OpenWaterUserTable
    {filteredReservations}
    findAssignment={findAssignment}
    assignmentVersion={assignmentVersion}
    onShowReservationDetails={onShowReservationDetails}
    timePeriod="PM"
  />
  {#if filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'PM').length > 0}
    <div class="reservation-list compact">
      {#each filteredReservations.filter((r) => r.res_type === 'open_water' && r?.time_period === 'PM') as res (res.uid)}
        <div
          class="reservation-item compact"
          class:status-confirmed={res.res_status === 'confirmed'}
          class:status-pending={res.res_status === 'pending'}
          class:status-rejected={res.res_status === 'rejected'}
          on:click={() => onShowReservationDetails(res)}
          on:keydown={(e) => e.key === 'Enter' && onShowReservationDetails(res)}
          role="button"
          tabindex="0"
          aria-label="View reservation details"
        >
          <div class="compact-content">
            <span class="compact-time">{res?.time_period || 'PM'}</span>
            {#key `${res.uid}-PM-${assignmentVersion}`}
              {#if (() => { const a = findAssignment(res.uid, 'PM'); return !(a.buoy === 'Not assigned' && a.boat === 'Not assigned' && assignmentVersion === 0); })()}
                {#await Promise.resolve(findAssignment(res.uid, 'PM')) then a}
                  <span class="compact-buoy">{a.buoy}</span>
                  <span class="compact-boat">{a.boat}</span>
                {/await}
              {/if}
            {/key}
            <span class="type-badge compact openwater">
              {getOpenWaterTypeDisplay(res?.open_water_type)}
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
    align-items: stretch;
  }

  .reservation-columns {
    display: contents;
  }

  .reservation-table {
    padding: 1rem;
    width: 100%;
    max-width: 520px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    min-height: 200px;
  }

  @media (min-width: 768px) {
    .reservation-table {
      max-width: 600px;
    }
  }

  @media (min-width: 1024px) {
    .reservation-table {
      max-width: 700px;
    }
    /* Widen item to keep all text on one row comfortably */
    .reservation-item.compact {
      max-width: 100%;
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
    max-width: 100%;
  }

  .reservation-item.compact:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }

  /* Status-based styling for reservation items */
  .reservation-item.status-confirmed {
    border-left: 4px solid #10b981;
    background: linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%);
  }

  .reservation-item.status-pending {
    border-left: 4px solid #f59e0b;
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
  }

  .reservation-item.status-rejected {
    border-left: 4px solid #ef4444;
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%);
  }

  .compact-content {
    display: flex;
    align-items: center;
    gap: 0.25rem; /* tighter spacing to match table columns visually */
    flex-wrap: nowrap; /* One row by default (desktop/tablet) */
    overflow: visible;
    white-space: nowrap;
  }

  

  .compact-time {
    font-size: clamp(0.75rem, 1.2vw, 0.875rem);
    font-weight: 500;
    color: #64748b;
    min-width: auto;
    flex-shrink: 0;
  }

  /* Removed .compact-assignment (no longer used) */

  .type-badge.compact {
    padding: 0.1rem 0.4rem; /* slightly smaller to align with inline text rhythm */
    font-size: clamp(0.6875rem, 1.1vw, 0.8125rem);
    border-radius: 12px;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
  }

  .type-badge.openwater {
    background: #d1fae5;
    color: #065f46;
  }

  /* Status badge styles removed (no longer rendered) */

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #64748b;
  }

  .empty-text {
    margin: 0;
    font-size: 0.875rem;
  }

  /* Removed unused .loading selector */

  /* Mobile compact tuning */
  @media (max-width: 480px) {
    .reservation-item.compact {
      padding: 0.5rem 0.625rem;
    }
    .compact-content {
      gap: 0.25rem;
      flex-wrap: wrap; /* Allow wrap on mobile for compactness */
      white-space: normal;
    }
    .compact-time,
    .compact-buoy,
    .compact-boat,
    .type-badge.compact {
      font-size: 0.75rem;
    }
    .type-badge.compact {
      letter-spacing: 0;
      text-transform: none;
    }
  }

  /* Align card content under table columns on wider screens */
  @media (min-width: 640px) {
    .compact-content {
      display: grid;
      grid-template-columns: 64px 112px 112px 1fr; /* Time | Buoy | Boat | Type */
      column-gap: 0.5rem;
      white-space: nowrap;
    }
    .compact-time,
    .compact-buoy,
    .compact-boat,
    .type-badge.compact {
      font-size: clamp(0.75rem, 1.1vw, 0.875rem);
    }
  }
</style>
