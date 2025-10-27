<script lang="ts">
  import dayjs from 'dayjs';

  export let reservation: any;
  
  // Status-based data display
  $: canonicalStatus = reservation?.status || reservation?.res_status || 'pending';
  // Display label only: show "Approved" when status is confirmed/approved; otherwise keep original
  $: displayStatus = (canonicalStatus === 'confirmed' || canonicalStatus === 'approved')
    ? 'Approved'
    : canonicalStatus;
  $: isConfirmed = canonicalStatus === 'confirmed';
  $: isPending = canonicalStatus === 'pending';
  $: isRejected = canonicalStatus === 'rejected';
  
  // Type-specific data based on database schema
  $: resType = reservation?.res_type || 'pool';
  $: isPool = resType === 'pool';
  $: isOpenWater = resType === 'open_water';
  $: isClassroom = resType === 'classroom';
</script>

<div class="details-grid">
  <div class="detail-item">
    <span class="detail-label">Date</span>
    <span class="detail-value">
      {#if reservation?.date}
        {dayjs(reservation.date).format('dddd, MMMM D, YYYY')}
      {:else if reservation?.res_date}
        {dayjs(reservation.res_date).format('dddd, MMMM D, YYYY')}
      {:else}
        No Date Available
      {/if}
    </span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Time</span>
    <span class="detail-value">
      {#if reservation?.startTime && reservation?.endTime}
        {dayjs(`2000-01-01T${reservation.startTime}`).format('h:mm A')} - {dayjs(`2000-01-01T${reservation.endTime}`).format('h:mm A')}
        {#if reservation.timeOfDay}
          <span class="time-period">({reservation.timeOfDay})</span>
        {/if}
      {:else if reservation?.startTime && !reservation?.endTime}
        {#if reservation?.res_type === 'open_water' && reservation?.time_period}
          {reservation.time_period}
        {:else}
          {reservation.startTime}
        {/if}
        {#if reservation.timeOfDay}
          <span class="time-period">({reservation.timeOfDay})</span>
        {/if}
      {:else if reservation?.res_date}
        {#if reservation?.start_time && reservation?.end_time}
          {dayjs(`2000-01-01T${reservation.start_time}`).format('h:mm A')} - {dayjs(`2000-01-01T${reservation.end_time}`).format('h:mm A')}
        {:else if reservation?.time_period}
          {reservation.time_period}
        {:else}
          {dayjs(reservation.res_date).format('h:mm A')} - {dayjs(new Date(new Date(reservation.res_date).getTime() + 60 * 60 * 1000).toISOString()).format('h:mm A')}
        {/if}
        {#if reservation.timeOfDay}
          <span class="time-period">({reservation.timeOfDay})</span>
        {/if}
      {:else}
        No Time Available
      {/if}
    </span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Category</span>
    <span class="detail-value">
      {#if reservation?.type}
        {reservation.type}
      {:else if reservation?.res_type}
        {reservation.res_type === 'pool' ? 'Pool' : 
         reservation.res_type === 'open_water' ? 'Open Water' : 
         reservation.res_type === 'classroom' ? 'Classroom' : 
         reservation.res_type}
      {:else}
        Unknown
      {/if}
    </span>
  </div>

  <div class="detail-item">
    <span class="detail-label">Status</span>
    <span class="detail-value">
      {displayStatus}
    </span>
  </div>

  {#if reservation?.timeOfDay}
    <div class="detail-item">
      <span class="detail-label">Time Period</span>
      <span class="detail-value">{reservation.timeOfDay}</span>
    </div>
  {:else if reservation?.res_date}
    <div class="detail-item">
      <span class="detail-label">Time Period</span>
      <span class="detail-value">
        {#if new Date(reservation.res_date).getHours() < 12}
          AM
        {:else}
          PM
        {/if}
      </span>
    </div>
  {/if}

  <!-- Status-specific information -->
  {#if isConfirmed}
    <div class="detail-item status-info confirmed">
      <span class="detail-label">Confirmation</span>
      <span class="detail-value">
        <span class="status-icon">✓</span>
        Your reservation has been confirmed and is ready to use.
      </span>
    </div>
  {/if}

  {#if isPending}
    <div class="detail-item status-info pending">
      <span class="detail-label">Pending Review</span>
      <span class="detail-value">
        <span class="status-icon">⏳</span>
        Your reservation is under review. You will be notified once approved.
      </span>
    </div>
  {/if}

  {#if isRejected}
    <div class="detail-item status-info rejected">
      <span class="detail-label">Rejection Notice</span>
      <span class="detail-value">
        <span class="status-icon">✗</span>
        This reservation has been rejected. Please contact support for more information.
      </span>
    </div>
  {/if}

  <!-- Type-specific data based on database schema -->
  {#if isPool}
    <div class="detail-item type-section pool">
      <span class="detail-label">Pool Details</span>
      <div class="type-details">
        {#if reservation}
          {#key reservation}
            {#await Promise.resolve(reservation) then r}
              {#if r}
                {#if r.start_time}
                  <div class="type-detail-item">
                    <span class="type-detail-label">Start Time:</span>
                    <span class="type-detail-value">{dayjs(`2000-01-01T${reservation.start_time}`).format('h:mm A')}</span>
                  </div>
                {/if}
                {#if r.end_time}
                  <div class="type-detail-item">
                    <span class="type-detail-label">End Time:</span>
                    <span class="type-detail-value">{dayjs(`2000-01-01T${reservation.end_time}`).format('h:mm A')}</span>
                  </div>
                {/if}
                {#if (function() { return true; })()}
                  {@const totalLanes = 8}
                  {@const explicitLane = r?.lane ?? r?.res_pool?.lane}
                  {@const startIdx = typeof r?.__display_lane_idx === 'number' ? (r.__display_lane_idx as number) : (explicitLane ? (Number(explicitLane) - 1) : -1)}
                  {@const poolType = r?.pool_type ?? r?.res_pool?.pool_type}
                  {@const studentsRaw = r?.student_count ?? r?.res_pool?.student_count}
                  {@const students = typeof studentsRaw === 'string' ? parseInt(studentsRaw, 10) : (studentsRaw || 0)}
                  {@const spanFromType = poolType === 'course_coaching' ? Math.max(1, Math.min(1 + (Number.isFinite(students) ? students : 0), totalLanes)) : 1}
                  {@const span = typeof r?.__display_span === 'number' ? (r.__display_span as number) : spanFromType}
                  {@const lanes = (startIdx >= 0 && span > 0) ? Array.from({ length: span }, (_, i) => String(startIdx + 1 + i)).filter(n => Number(n) >= 1 && Number(n) <= totalLanes) : []}
                  {#if lanes.length}
                    <div class="type-detail-item">
                      <span class="type-detail-label">Lane(s):</span>
                      <span class="type-detail-value">{lanes.join(', ')}</span>
                    </div>
                  {/if}
                {/if}
                {#if r.note}
                  <div class="type-detail-item">
                    <span class="type-detail-label">Note:</span>
                    <span class="type-detail-value">{reservation.note}</span>
                  </div>
                {/if}
              {/if}
            {/await}
          {/key}
        {/if}
      </div>
    </div>
  {/if}

  {#if isClassroom}
    <div class="detail-item type-section classroom">
      <span class="detail-label">Classroom Details</span>
      <div class="type-details">
        {#if reservation?.start_time}
          <div class="type-detail-item">
            <span class="type-detail-label">Start Time:</span>
            <span class="type-detail-value">{dayjs(`2000-01-01T${reservation.start_time}`).format('h:mm A')}</span>
          </div>
        {/if}
        {#if reservation?.end_time}
          <div class="type-detail-item">
            <span class="type-detail-label">End Time:</span>
            <span class="type-detail-value">{dayjs(`2000-01-01T${reservation.end_time}`).format('h:mm A')}</span>
          </div>
        {/if}
        {#if reservation?.room}
          <div class="type-detail-item">
            <span class="type-detail-label">Room:</span>
            <span class="type-detail-value">{reservation.room}</span>
          </div>
        {/if}
        {#if reservation?.note}
          <div class="type-detail-item">
            <span class="type-detail-label">Note:</span>
            <span class="type-detail-value">{reservation.note}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if isOpenWater}
    <div class="detail-item type-section openwater">
      <span class="detail-label">Open Water Details</span>
      <div class="type-details">
        {#if reservation?.time_period}
          <div class="type-detail-item">
            <span class="type-detail-label">Time Period:</span>
            <span class="type-detail-value">{reservation.time_period}</span>
          </div>
        {/if}
        {#if reservation?.depth_m}
          <div class="type-detail-item">
            <span class="type-detail-label">Depth (m):</span>
            <span class="type-detail-value">{reservation.depth_m}m</span>
          </div>
        {/if}
        {#if reservation?.buoy}
          <div class="type-detail-item">
            <span class="type-detail-label">Buoy:</span>
            <span class="type-detail-value">{reservation.buoy}</span>
          </div>
        {/if}
        <!-- Auto adjust closest functionality removed -->
        {#if reservation?.pulley !== null}
          <div class="type-detail-item">
            <span class="type-detail-label">Pulley:</span>
            <span class="type-detail-value">{reservation.pulley ? 'Yes' : 'No'}</span>
          </div>
        {/if}
        {#if reservation?.bottom_plate !== null}
          <div class="type-detail-item">
            <span class="type-detail-label">Bottom Plate:</span>
            <span class="type-detail-value">{reservation.bottom_plate ? 'Yes' : 'No'}</span>
          </div>
        {/if}
        {#if reservation?.large_buoy !== null}
          <div class="type-detail-item">
            <span class="type-detail-label">Large Buoy:</span>
            <span class="type-detail-value">{reservation.large_buoy ? 'Yes' : 'No'}</span>
          </div>
        {/if}
        {#if reservation?.note}
          <div class="type-detail-item">
            <span class="type-detail-label">Note:</span>
            <span class="type-detail-value">{reservation.note}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
    padding: 0.5rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .detail-item:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
    line-height: 1.4;
  }

  .time-period {
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
    margin-left: 0.25rem;
  }

  /* Status information styling */
  .status-info {
    grid-column: 1 / -1;
    padding: 0.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-top: 0.5rem;
  }

  .status-info.confirmed {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-color: #bbf7d0;
  }

  .status-info.pending {
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
    border-color: #fde68a;
  }

  .status-info.rejected {
    background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
    border-color: #fecaca;
  }

  .status-info .detail-label {
    color: #374151;
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: block;
    font-size: 0.875rem;
    text-transform: none;
    letter-spacing: normal;
  }

  .status-info .detail-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 400;
  }

  .status-icon {
    font-size: 1rem;
    font-weight: bold;
  }

  /* Type-specific sections */
  .type-section {
    grid-column: 1 / -1;
    padding: 0.75rem;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-top: 0.5rem;
  }

  .type-section.pool {
    border-left: 4px solid #3b82f6;
  }

  .type-section.classroom {
    border-left: 4px solid #ef4444;
  }

  .type-section.openwater {
    border-left: 4px solid #10b981;
  }

  .type-section .detail-label {
    color: #374151;
    font-weight: 600;
    margin-bottom: 0.75rem;
    display: block;
    font-size: 0.875rem;
    text-transform: none;
    letter-spacing: normal;
  }

  .type-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .type-detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
  }

  .type-detail-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .type-detail-value {
    font-size: 0.8125rem;
    color: #1e293b;
    font-weight: 500;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .details-grid {
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 0.25rem;
    }

    .detail-item {
      padding: 0.5rem;
      font-size: 0.75rem;
    }

    .detail-label {
      font-size: 0.6875rem;
    }

    .detail-value {
      font-size: 0.75rem;
    }

    .type-details {
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .type-detail-item {
      padding: 0.375rem;
      font-size: 0.6875rem;
    }

    .type-detail-label {
      font-size: 0.625rem;
    }

    .type-detail-value {
      font-size: 0.6875rem;
    }
  }

  /* Tablet Responsive */
  @media (max-width: 1024px) and (min-width: 769px) {
    .details-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }
</style>
