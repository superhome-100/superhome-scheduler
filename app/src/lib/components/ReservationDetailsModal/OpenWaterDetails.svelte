<script lang="ts">
  export let reservation: any;
  export let owDepth: number | null = null;
</script>

{#if reservation?.res_type === 'open_water' || reservation?.type === 'Open Water'}
  <div class="openwater-details">
    <!-- Open Water Type -->
    {#if reservation?.open_water_type}
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
    {#if reservation?.open_water_type === 'course_coaching' && reservation?.student_count}
      <div class="detail-item">
        <span class="detail-label">No. of Students</span>
        <span class="detail-value">{reservation.student_count}</span>
      </div>
    {/if}
    
    <!-- Show depth from reservation data -->
    {#if owDepth !== null || (reservation?.depth_m !== null && reservation?.depth_m !== undefined)}
      <div class="detail-item">
        <span class="detail-label">Depth (m)</span>
        <span class="detail-value">{owDepth !== null ? owDepth : reservation.depth_m}</span>
      </div>
    {/if}
    <div class="detail-item">
    </div>
    {#if reservation?.buoy}
      <div class="detail-item">
        <span class="detail-label">Buoy</span>
        <span class="detail-value">{reservation.buoy}</span>
      </div>
    {/if}
    <!-- Auto adjust closest functionality removed -->
    {#if reservation?.pulley !== null && reservation?.pulley !== undefined}
      <div class="detail-item">
        <span class="detail-label">Pulley</span>
        <span class="detail-value">{reservation.pulley ? 'Yes' : 'No'}</span>
      </div>
    {/if}
    {#if reservation?.deep_fim_training !== null && reservation?.deep_fim_training !== undefined}
      <div class="detail-item">
        <span class="detail-label">Deep FIM Training</span>
        <span class="detail-value">{reservation.deep_fim_training ? 'Yes' : 'No'}</span>
      </div>
    {/if}
    {#if reservation?.bottom_plate !== null && reservation?.bottom_plate !== undefined}
      <div class="detail-item">
        <span class="detail-label">Bottom Plate</span>
        <span class="detail-value">{reservation.bottom_plate ? 'Yes' : 'No'}</span>
      </div>
    {/if}
    {#if reservation?.large_buoy !== null && reservation?.large_buoy !== undefined}
      <div class="detail-item">
        <span class="detail-label">Large Buoy</span>
        <span class="detail-value">{reservation.large_buoy ? 'Yes' : 'No'}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .openwater-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-radius: 8px;
    border: 1px solid #bbf7d0;
    border-left: 4px solid #10b981;
    margin-top: 0.5rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;
  }

  .detail-item:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .detail-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 0.8125rem;
    color: #1e293b;
    font-weight: 500;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .openwater-details {
      grid-template-columns: 1fr;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .detail-item {
      padding: 0.375rem;
    }
  }

  /* Tablet Responsive */
  @media (max-width: 1024px) and (min-width: 769px) {
    .openwater-details {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }
  }
</style>
