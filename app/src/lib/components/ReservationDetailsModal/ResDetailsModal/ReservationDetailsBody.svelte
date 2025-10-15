<script lang="ts">
  import dayjs from 'dayjs';
  import ReservationTypeDetails from './ReservationTypeDetails.svelte';
  import OpenWaterDetailsLoader from './OpenWaterDetailsLoader.svelte';

  export let reservation: any;
  export let displayType: string;
  export let displayDate: string;
  export let displayNotes: string;
  export let owDepth: number | null = null;
</script>

<div class="modal-body">
  <div class="reservation-details">
    <!-- Main details -->
    <div class="details-grid">
      <div class="detail-item">
        <span class="detail-label">Date</span>
        <span class="detail-value">{dayjs(displayDate).format('dddd, MMMM D, YYYY')}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Type</span>
        <span class="detail-value">{displayType}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">{reservation.status || reservation.res_status || 'pending'}</span>
      </div>

      {#if reservation.timeOfDay}
        <div class="detail-item">
          <span class="detail-label">Time Period</span>
          <span class="detail-value">{reservation.timeOfDay}</span>
        </div>
      {/if}

      <!-- Type-specific details -->
      <ReservationTypeDetails {reservation} {displayType} {owDepth} />
    </div>

    <!-- Equipment Grid (2x2) -->
    {#if (reservation.pulley !== null || reservation.deep_fim_training !== null || reservation.bottom_plate !== null || reservation.large_buoy !== null)}
      <div class="equipment-section">
        <h3 class="equipment-title">Equipment</h3>
        <div class="equipment-grid">
          {#if reservation.pulley !== null}
            <div class="detail-item">
              <span class="detail-label">Pulley</span>
              <span class="detail-value">{reservation.pulley ? 'Yes' : 'No'}</span>
            </div>
          {/if}
          {#if reservation.deep_fim_training !== null}
            <div class="detail-item">
              <span class="detail-label">Deep FIM Training</span>
              <span class="detail-value">{reservation.deep_fim_training ? 'Yes' : 'No'}</span>
            </div>
          {/if}
          {#if reservation.bottom_plate !== null}
            <div class="detail-item">
              <span class="detail-label">Bottom Plate</span>
              <span class="detail-value">{reservation.bottom_plate ? 'Yes' : 'No'}</span>
            </div>
          {/if}
          {#if reservation.large_buoy !== null}
            <div class="detail-item">
              <span class="detail-label">Large Buoy</span>
              <span class="detail-value">{reservation.large_buoy ? 'Yes' : 'No'}</span>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if displayNotes}
      <div class="notes-section">
        <h3 class="notes-title">Notes</h3>
        <p class="notes-content">{displayNotes}</p>
      </div>
    {/if}
  </div>
</div>

<!-- Load Open Water details if needed -->
<OpenWaterDetailsLoader {reservation} bind:owDepth />

<style>
  .modal-body {
    padding: 0 1.5rem 1.5rem 1.5rem;
    flex: 1;
  }

  .reservation-details {
    display: flex;
    flex-direction: column;
    gap: 0;
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

  .equipment-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .equipment-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .notes-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
  }

  .notes-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .notes-content {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
    margin: 0;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-body {
      padding: 0.5rem 0.75rem;
    }

    .reservation-details {
      gap: 0.75rem;
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

    .equipment-section {
      margin-top: 0;
      padding-top: 0.5rem;
    }

    .equipment-title {
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .equipment-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.25rem;
    }

    .notes-section {
      margin-top: 0;
      padding-top: 0.5rem;
    }

    .notes-title {
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
    }

    .notes-content {
      font-size: 0.6875rem;
    }
  }
</style>
