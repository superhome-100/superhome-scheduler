<script lang="ts">
  import type { MemberRow } from '$lib/types/groupReservation';
  import { typeLabel, showEquipment } from '$lib/types/groupReservation';

  export let member: MemberRow;

  // Only show equipment for Course/Coaching and Autonomous on Buoy
  $: shouldShowEquipment = (
    showEquipment(member.activity_type) ||
    member.open_water_type === 'course_coaching' ||
    member.open_water_type === 'autonomous_buoy'
  );
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
    
    {#if shouldShowEquipment}
      <div class="member-equipment">
        <div class="equipment-grid">
          <div class="equipment-item">
            <span class="equipment-label">Pulley</span>
            <span class="equipment-value">{member.pulley ? 'Yes' : 'No'}</span>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">Deep FIM Training</span>
            <span class="equipment-value">{member.deep_fim_training ? 'Yes' : 'No'}</span>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">Bottom Plate</span>
            <span class="equipment-value">{member.bottom_plate ? 'Yes' : 'No'}</span>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">Large Buoy</span>
            <span class="equipment-value">{member.large_buoy ? 'Yes' : 'No'}</span>
          </div>
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

  /* Compact equipment grid */
  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.25rem 0.5rem;
  }

  .equipment-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border-top: 1px solid #e5e7eb; /* thin separator */
    padding-top: 0.25rem;
  }

  /* Remove top border for first row items in 2-column grid */
  .equipment-item:nth-child(1),
  .equipment-item:nth-child(2) {
    border-top: none;
    padding-top: 0;
  }

  .equipment-label {
    font-size: 0.625rem;
    color: #64748b;
    font-weight: 500;
  }

  .equipment-value {
    font-size: 0.625rem;
    font-weight: 600;
    color: #1e293b;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .member-card {
      padding: 0.75rem;
    }

    .member-header {
      flex-direction: row; /* keep name and type on one row */
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .member-name {
      font-size: 0.75rem;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .member-type {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      align-self: auto;
      white-space: nowrap;
    }

    .member-detail-label,
    .member-detail-value {
      font-size: 0.625rem;
    }

    /* Keep depth label and value on one line */
    .member-detail {
      flex-wrap: nowrap;
    }
    .member-detail-label {
      white-space: nowrap;
    }
    .member-detail-value {
      white-space: nowrap;
    }

    .equipment-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.25rem 0.5rem;
    }
  }
</style>
