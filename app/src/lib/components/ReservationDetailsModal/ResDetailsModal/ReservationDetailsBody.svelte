<script lang="ts">
  import dayjs from 'dayjs';
  import { onMount } from 'svelte';
  import ReservationTypeDetails from './ReservationTypeDetails.svelte';
  import OpenWaterDetailsLoader from './OpenWaterDetailsLoader.svelte';

  export let reservation: any;
  export let displayType: string;
  export let displayDate: string;
  export let displayNotes: string;
  export let owDepth: number | null = null;
  export let isAdmin: boolean = false;

  // Format time values gracefully (supports HH:mm and HH:mm:ss)
  const formatTime = (t?: string | null) => {
    if (!t) return '';
    let parsed = dayjs(t, ['HH:mm', 'HH:mm:ss'], true);
    if (!parsed.isValid()) {
      // Fallback: try generic parse (ISO or Date-like)
      parsed = dayjs(t);
    }
    return parsed.isValid() ? parsed.format('h:mm A') : t;
  };

  const poolTypeLabel = (value?: string | null) => {
    if (!value) return '';
    if (value === 'course_coaching') return 'Course/Coaching';
    if (value === 'autonomous') return 'Autonomous';
    return value;
  };

  const classroomTypeLabel = (value?: string | null) => {
    if (!value) return '';
    if (value === 'course_coaching') return 'Course/Coaching';
    return value;
  };

  // Derived pool type with fallbacks from raw reservation payload
  $: derivedPoolType = reservation?.pool_type
    ?? reservation?.raw_reservation?.pool_type
    ?? reservation?.raw_reservation?.res_pool?.pool_type
    ?? null;

  // Derived classroom type with fallbacks from raw reservation payload
  $: derivedClassroomType = reservation?.classroom_type
    ?? reservation?.res_classroom?.classroom_type
    ?? reservation?.raw_reservation?.classroom_type
    ?? reservation?.raw_reservation?.res_classroom?.classroom_type
    ?? null;

  // Derived start/end times with robust fallbacks (Pool/Classroom)
  $: rawStartTime = (
    reservation?.start_time
    ?? reservation?.startTime
    ?? reservation?.res_classroom?.start_time
    ?? reservation?.res_pool?.start_time
    ?? reservation?.raw_reservation?.start_time
    ?? reservation?.raw_reservation?.res_classroom?.start_time
    ?? reservation?.raw_reservation?.res_pool?.start_time
    ?? null
  );

  // Derived room and student count
  $: derivedRoom = (
    reservation?.room
    ?? reservation?.res_classroom?.room
    ?? reservation?.raw_reservation?.room
    ?? reservation?.raw_reservation?.res_classroom?.room
    ?? null
  );

  $: derivedStudentCount = (
    reservation?.student_count
    ?? reservation?.res_classroom?.student_count
    ?? reservation?.raw_reservation?.student_count
    ?? reservation?.raw_reservation?.res_classroom?.student_count
    ?? null
  );

  $: rawEndTime = (
    reservation?.end_time
    ?? reservation?.endTime
    ?? reservation?.res_classroom?.end_time
    ?? reservation?.res_pool?.end_time
    ?? reservation?.raw_reservation?.end_time
    ?? reservation?.raw_reservation?.res_classroom?.end_time
    ?? reservation?.raw_reservation?.res_pool?.end_time
    ?? null
  );

  // (Debug logging removed to keep file lean and within line limits)

  // Display status mapping: show "Approved" for confirmed/approved
  $: canonicalStatus = reservation?.status || reservation?.res_status || 'pending';
  $: displayStatus = (canonicalStatus === 'confirmed' || canonicalStatus === 'approved')
    ? 'Approved'
    : canonicalStatus;

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
        <span class="detail-label">Category</span>
        <span class="detail-value">{displayType}</span>
      </div>

      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-value">{displayStatus}</span>
      </div>


      {#if (reservation.res_type === 'pool' || displayType === 'Pool') && derivedPoolType}
        <div class="detail-item">
          <span class="detail-label">Pool Type</span>
          <span class="detail-value">{poolTypeLabel(derivedPoolType)}</span>
        </div>
      {/if}

      <!-- Classroom Type will be shown later in a fixed position for Classroom -->

      {#if displayType === 'Open Water'}
        {#if reservation.time_period || reservation.timeOfDay}
          <div class="detail-item">
            <span class="detail-label">Time Period</span>
            <span class="detail-value">{reservation.time_period ?? reservation.timeOfDay}</span>
          </div>
        {/if}
      {:else if displayType === 'Pool' || displayType === 'Classroom'}
        {#if rawStartTime || rawEndTime}
          <div class="detail-item">
            <span class="detail-label">Start Time</span>
            <span class="detail-value">{rawStartTime ? formatTime(rawStartTime) : '—'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">End Time</span>
            <span class="detail-value">{rawEndTime ? formatTime(rawEndTime) : '—'}</span>
          </div>
        {/if}
      {/if}

      {#if displayType === 'Classroom'}
        <div class="detail-item">
          <span class="detail-label">No. of Students</span>
          <span class="detail-value">{derivedStudentCount ?? '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Classroom Type</span>
          <span class="detail-value">{derivedClassroomType ? classroomTypeLabel(derivedClassroomType) : '—'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Room assigned</span>
          <span class="detail-value">{derivedRoom ?? '—'}</span>
        </div>
      {/if}

      <!-- Type-specific details (skip for Classroom to avoid duplicates in admin layout) -->
      {#if displayType !== 'Classroom'}
        <ReservationTypeDetails {reservation} {displayType} {owDepth} />
      {/if}
    </div>

    <!-- Equipment Grid (2x2) -->
    {#if !(isAdmin && displayType === 'Classroom') && (reservation.pulley !== null || reservation.deep_fim_training !== null || reservation.bottom_plate !== null || reservation.large_buoy !== null)}
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

    {#if !(isAdmin && displayType === 'Classroom') && displayNotes}
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
