<script lang="ts">
  import OpenWaterDetailsLoader from './OpenWaterDetailsLoader.svelte';

  export let reservation: any;
  export let displayType: string;
  export let owDepth: number | null = null;

  // Resolve assigned boat from various possible shapes
  $: assignedBoat = (
    reservation?.boat
    ?? reservation?.buoy_group?.boat
    ?? reservation?.raw_reservation?.boat
    ?? reservation?.raw_reservation?.buoy_group?.boat
    ?? null
  );
</script>

<!-- Pool specific details -->
{#if displayType === 'Pool'}
  {@const totalLanes = 8}
  {@const explicitLane = reservation?.lane ?? reservation?.res_pool?.lane}
  {@const startIdx = typeof reservation?.__display_lane_idx === 'number' ? (reservation.__display_lane_idx as number) : (explicitLane ? (Number(explicitLane) - 1) : -1)}
  {@const poolType = (
    reservation?.pool_type
    ?? reservation?.poolType
    ?? reservation?.res_pool?.pool_type
    ?? reservation?.res_pool?.poolType
    ?? reservation?.raw_reservation?.pool_type
    ?? reservation?.raw_reservation?.poolType
    ?? reservation?.raw_reservation?.res_pool?.pool_type
    ?? reservation?.raw_reservation?.res_pool?.poolType
  )}
  {@const studentsRaw = (
    reservation?.student_count
    ?? reservation?.pool?.student_count
    ?? reservation?.pool?.studentCount
    ?? reservation?.res_pool?.student_count
    ?? reservation?.res_pool?.studentCount
    ?? reservation?.raw_reservation?.student_count
    ?? reservation?.raw_reservation?.studentCount
    ?? reservation?.raw_reservation?.pool?.student_count
    ?? reservation?.raw_reservation?.pool?.studentCount
    ?? reservation?.raw_reservation?.res_pool?.student_count
    ?? reservation?.raw_reservation?.res_pool?.studentCount
  )}
  {@const students = typeof studentsRaw === 'string' ? parseInt(studentsRaw, 10) : (studentsRaw || 0)}
  {@const spanFromType = poolType === 'course_coaching' ? Math.max(1, Math.min(1 + (Number.isFinite(students) ? students : 0), totalLanes)) : 1}
  {@const span = typeof reservation?.__display_span === 'number' ? (reservation.__display_span as number) : spanFromType}
  {@const lanes = (startIdx >= 0 && span > 0) ? Array.from({ length: span }, (_, i) => String(startIdx + 1 + i)).filter(n => Number(n) >= 1 && Number(n) <= totalLanes) : []}
  {#if lanes.length}
    <div class="detail-item">
      <span class="detail-label">Lane(s)</span>
      <span class="detail-value">{lanes.join(', ')}</span>
    </div>
  {/if}
{/if}

<!-- Classroom specific details -->
{#if displayType === 'Classroom'}
  {#if reservation.room}
    <div class="detail-item">
      <span class="detail-label">Room</span>
      <span class="detail-value">{reservation.room}</span>
    </div>
  {/if}
  {@const classroomStudents = (
    reservation?.student_count
    ?? reservation?.res_classroom?.student_count
    ?? reservation?.res_classroom?.studentCount
    ?? reservation?.raw_reservation?.student_count
    ?? reservation?.raw_reservation?.studentCount
    ?? reservation?.raw_reservation?.res_classroom?.student_count
    ?? reservation?.raw_reservation?.res_classroom?.studentCount
  )}
  {#if (reservation.classroom_type === 'course_coaching' || reservation.res_classroom?.classroom_type === 'course_coaching') && classroomStudents}
    <div class="detail-item">
      <span class="detail-label">No. of Students</span>
      <span class="detail-value">{classroomStudents}</span>
    </div>
  {/if}
{/if}

<!-- Open Water specific details -->
{#if displayType === 'Open Water'}
  <!-- Open Water Type -->
  {#if reservation.open_water_type}
    <div class="detail-item">
      <span class="detail-label">Open Water Type</span>
      <span class="detail-value">
        {#if reservation.open_water_type === 'course_coaching'}
          Course/Coaching
        {:else if reservation.open_water_type === 'autonomous_buoy'}
          Autonomous on Buoy (0-89m)
        {:else if reservation.open_water_type === 'autonomous_platform'}
          Autonomous on Platform (0-99m)
        {:else if reservation.open_water_type === 'autonomous_platform_cbs'}
          Autonomous on Platform+CBS (90-130m)
        {:else}
          {reservation.open_water_type}
        {/if}
      </span>
    </div>
  {/if}
  
  <!-- Student Count (for Course/Coaching) -->
  {@const owStudents = (
    reservation?.student_count
    ?? reservation?.res_openwater?.student_count
    ?? reservation?.res_openwater?.studentCount
    ?? reservation?.raw_reservation?.student_count
    ?? reservation?.raw_reservation?.studentCount
    ?? reservation?.raw_reservation?.res_openwater?.student_count
    ?? reservation?.raw_reservation?.res_openwater?.studentCount
  )}
  {#if reservation.open_water_type === 'course_coaching' && owStudents}
    <div class="detail-item">
      <span class="detail-label">No. of Students</span>
      <span class="detail-value">{owStudents}</span>
    </div>
  {/if}
  
  <!-- Show depth from pairing info if available, otherwise from reservation data -->
  {#if owDepth !== null || reservation.depth_m}
    <div class="detail-item">
      <span class="detail-label">Depth (m)</span>
      <span class="detail-value">{owDepth !== null ? owDepth : reservation.depth_m}</span>
    </div>
  {/if}

  <!-- Assigned Boat -->
  {#if assignedBoat}
    <div class="detail-item">
      <span class="detail-label">Assigned Boat</span>
      <span class="detail-value">{assignedBoat}</span>
    </div>
  {/if}
  
  <div class="detail-item">
  </div>
  
  {#if reservation.buoy}
    <div class="detail-item">
      <span class="detail-label">Buoy</span>
      <span class="detail-value">{reservation.buoy}</span>
    </div>
  {/if}
{/if}

<style>
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
