<script lang="ts">
  import dayjs from 'dayjs';
  import type { MemberRow } from '$lib/types/groupReservation';

  export let resDate: string = '';
  export let timePeriod: 'AM' | 'PM' = 'AM';
  export let boat: string | null = null;
  export let buoyName: string | null = null;
  export let members: MemberRow[] = [];
</script>

<div class="reservation-details">
  <!-- Header with type badge -->
  <div class="reservation-header">
    <div class="badges">
      <span class="type-badge openwater">Open Water</span>
    </div>
  </div>

  <!-- Main details -->
  <div class="details-grid">
    <div class="detail-item">
      <span class="detail-label">Date</span>
      <span class="detail-value">{dayjs(resDate).format('dddd, MMMM D, YYYY')}</span>
    </div>

    <div class="detail-item">
      <span class="detail-label">Time Period</span>
      <span class="detail-value">{timePeriod}</span>
    </div>

    <div class="detail-item">
      <span class="detail-label">Buoy</span>
      <span class="detail-value">{buoyName || 'Not assigned'}</span>
    </div>

    <div class="detail-item">
      <span class="detail-label">Boat</span>
      <span class="detail-value">{boat || 'Not assigned'}</span>
    </div>

    <div class="detail-item">
      <span class="detail-label">Group Size</span>
      <span class="detail-value">{members.length} member{members.length !== 1 ? 's' : ''}</span>
    </div>

    {#if members.some(m => m.activity_type === 'course_coaching' || m.open_water_type === 'course_coaching')}
      <div class="detail-item">
        <span class="detail-label">Total Students</span>
        <span class="detail-value">{members.reduce((sum, m) => sum + (m.student_count || 0), 0)}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .reservation-details {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .reservation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .type-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-badge.openwater {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .reservation-details {
      gap: 0.75rem;
    }

    .reservation-header {
      flex-direction: column;
      gap: 0.375rem;
      margin-bottom: 0.5rem;
    }

    .badges {
      gap: 0.375rem;
    }

    .type-badge {
      font-size: 0.625rem;
      padding: 0.1875rem 0.375rem;
    }

    .details-grid {
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
    }

    .detail-item {
      padding: 0.25rem;
      font-size: 0.6875rem;
    }

    .detail-label {
      font-size: 0.625rem;
    }

    .detail-value {
      font-size: 0.6875rem;
    }
  }
</style>
