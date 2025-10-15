<script lang="ts">
  import type { MemberRow } from '$lib/types/groupReservation';
  import { typeLabel, showEquipment } from '$lib/types/groupReservation';

  export let member: MemberRow;
</script>

<div class="member-card">
  <div class="member-header">
    <span class="member-name">{member.name || 'Unknown'}</span>
    <span class="member-type">{typeLabel(member.activity_type, member.open_water_type)}</span>
  </div>
  
  <div class="member-details">
    {#if member.student_count !== null && member.student_count > 0}
      <div class="member-detail">
        <span class="member-detail-label">Students:</span>
        <span class="member-detail-value">{member.student_count}</span>
      </div>
    {/if}
    
    {#if member.depth_m !== null}
      <div class="member-detail">
        <span class="member-detail-label">Depth:</span>
        <span class="member-detail-value">{member.depth_m}m</span>
      </div>
    {/if}
    
    {#if showEquipment(member.activity_type)}
      <div class="member-equipment">
        <span class="member-detail-label">Equipment:</span>
        <div class="equipment-badges">
          {#if member.bottom_plate}
            <span class="equipment-badge">Bottom Plate</span>
          {/if}
          {#if member.pulley}
            <span class="equipment-badge">Pulley</span>
          {/if}
          {#if member.large_buoy}
            <span class="equipment-badge">Large Buoy</span>
          {/if}
          {#if !member.bottom_plate && !member.pulley && !member.large_buoy}
            <span class="equipment-badge none">None</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .member-card {
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .member-card:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }

  .member-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }

  .member-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e293b;
    flex: 1;
  }

  .member-type {
    font-size: 0.75rem;
    color: #64748b;
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    padding: 0.125rem 0.5rem;
    border-radius: 8px;
    font-weight: 500;
    white-space: nowrap;
  }

  .member-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .member-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .member-detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
  }

  .member-detail-value {
    font-size: 0.75rem;
    color: #1e293b;
    font-weight: 500;
  }

  .member-equipment {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .equipment-badges {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .equipment-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
    border-radius: 6px;
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
    font-weight: 500;
  }

  .equipment-badge.none {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .member-card {
      padding: 0.75rem;
    }

    .member-header {
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .member-name {
      font-size: 0.75rem;
    }

    .member-type {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      align-self: flex-start;
    }

    .member-detail-label,
    .member-detail-value {
      font-size: 0.625rem;
    }

    .equipment-badge {
      font-size: 0.5rem;
      padding: 0.125rem 0.25rem;
    }
  }
</style>
