<script lang="ts">
  import OpenWaterDetailsLoader from './OpenWaterDetailsLoader.svelte';

  export let reservation: any;
  export let displayType: string;
  export let owDepth: number | null = null;
</script>

<!-- Pool specific details -->
{#if displayType === 'Pool' && reservation.lane}
  <div class="detail-item">
    <span class="detail-label">Lane</span>
    <span class="detail-value">{reservation.lane}</span>
  </div>
{/if}

<!-- Classroom specific details -->
{#if displayType === 'Classroom' && reservation.room}
  <div class="detail-item">
    <span class="detail-label">Room</span>
    <span class="detail-value">{reservation.room}</span>
  </div>
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
  {#if reservation.open_water_type === 'course_coaching' && reservation.student_count}
    <div class="detail-item">
      <span class="detail-label">No. of Students</span>
      <span class="detail-value">{reservation.student_count}</span>
    </div>
  {/if}
  
  <!-- Show depth from pairing info if available, otherwise from reservation data -->
  {#if owDepth !== null || reservation.depth_m}
    <div class="detail-item">
      <span class="detail-label">Depth (m)</span>
      <span class="detail-value">{owDepth !== null ? owDepth : reservation.depth_m}</span>
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
