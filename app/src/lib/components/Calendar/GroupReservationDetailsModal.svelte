<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import dayjs from 'dayjs';

  export type ActivityType =
    | 'course_coaching'
    | 'autonomous_buoy_0_89'
    | 'autonomous_platform_0_99'
    | 'autonomous_platform_cbs_90_130'
    | string
    | null;

  export interface MemberRow {
    uid: string;
    name: string | null;
    depth_m: number | null;
    student_count: number | null;
    bottom_plate: boolean;
    pulley: boolean;
    large_buoy: boolean;
    activity_type: ActivityType;
    open_water_type: string | null;
  }

  export let open = false;
  export let resDate: string = '';
  export let timePeriod: 'AM' | 'PM' = 'AM';
  export let boat: string | null = null;
  export let buoyName: string | null = null;
  export let members: MemberRow[] = [];

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  function typeLabel(act: ActivityType, openWaterType: string | null): string {
    if (act === 'course_coaching') return 'Course/Coaching';
    if (act === 'autonomous_buoy_0_89') return 'Autonomous on Buoy (0-89m)';
    if (act === 'autonomous_platform_0_99') return 'Autonomous on Platform (0-99m)';
    if (act === 'autonomous_platform_cbs_90_130') return 'Autonomous on Platform + CBS (90-130m)';
    // Check open_water_type for course_coaching as well
    if (openWaterType === 'course_coaching') return 'Course/Coaching';
    // Fallback to open_water_type display if provided
    return openWaterType || 'Open Water';
  }

  function showEquipment(act: ActivityType) {
    // Equipment shown for Course/Coaching and Autonomous Buoy (0-89m)
    return act === 'course_coaching' || act === 'autonomous_buoy_0_89';
  }

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div 
    class="modal-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="dialog"
    aria-modal="true"
    aria-label="Group Reservation Details"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Group Reservation Details</h2>
        <button 
          class="modal-close" 
          on:click={close}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
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

          <!-- Group Members Section -->
          <div class="members-section">
            <h3 class="members-title">Group Members</h3>
            <div class="members-grid">
              {#each members as member}
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
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button 
          type="button" 
          class="btn btn-primary" 
          on:click={close}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem 0 1.5rem;
    border-bottom: none;
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
    line-height: 1;
  }

  .modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .modal-body {
    padding: 0 1.5rem 1.5rem 1.5rem;
    flex: 1;
  }

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

  .members-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .members-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }

  .members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

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

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 100px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-content {
      max-height: 95vh;
      margin: 0;
    }

    .modal-header {
      padding: 0.5rem 0.75rem;
    }

    .modal-title {
      font-size: 0.875rem;
    }

    .modal-body {
      padding: 0.5rem 0.75rem;
    }

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

    .members-section {
      margin-top: 0;
      padding-top: 0.5rem;
    }

    .members-title {
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .members-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

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

    .modal-actions {
      padding: 0.5rem 0.75rem;
    }

    .btn {
      width: 100%;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
    }
  }

  /* Tablet Responsive */
  @media (max-width: 1024px) and (min-width: 769px) {
    .members-grid {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
  }
</style>
