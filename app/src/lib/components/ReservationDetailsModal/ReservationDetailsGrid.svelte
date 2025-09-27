<script lang="ts">
  import { formatDate, formatTime } from './modalUtils';

  export let reservation: any;
</script>

<div class="details-grid">
  <div class="detail-item">
    <span class="detail-label">Date</span>
    <span class="detail-value">
      {#if reservation?.date}
        {formatDate(reservation.date)}
      {:else if reservation?.res_date}
        {formatDate(reservation.res_date)}
      {:else}
        No Date Available
      {/if}
    </span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Time</span>
    <span class="detail-value">
      {#if reservation?.startTime && reservation?.endTime}
        {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
        {#if reservation.timeOfDay}
          <span class="time-period">({reservation.timeOfDay})</span>
        {/if}
      {:else if reservation?.res_date}
        {formatTime(new Date(reservation.res_date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }))} - {formatTime(new Date(new Date(reservation.res_date).getTime() + 60 * 60 * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }))}
        {#if reservation.timeOfDay}
          <span class="time-period">({reservation.timeOfDay})</span>
        {/if}
      {:else}
        No Time Available
      {/if}
    </span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Type</span>
    <span class="detail-value">{reservation?.type || reservation?.res_type || 'Unknown'}</span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Status</span>
    <span class="detail-value">{reservation?.status || reservation?.res_status || 'Unknown'}</span>
  </div>

  {#if reservation?.timeOfDay}
    <div class="detail-item">
      <span class="detail-label">Time Period</span>
      <span class="detail-value">{reservation.timeOfDay}</span>
    </div>
  {/if}
</div>

<style>
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

  .time-period {
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
    margin-left: 0.25rem;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .details-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
</style>
