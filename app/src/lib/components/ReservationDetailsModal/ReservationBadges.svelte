<script lang="ts">
  export let reservation: any;
  // Compute canonical status from either field
  $: canonicalStatus = reservation?.status || reservation?.res_status || 'pending';
  // Map only for display (match old modal wording)
  $: displayStatus = canonicalStatus === 'confirmed' ? 'approved' : canonicalStatus;
</script>

<div class="badges">
  <span class="type-badge" 
        class:pool={reservation.type === 'Pool' || reservation.res_type === 'pool'} 
        class:openwater={reservation.type === 'Open Water' || reservation.res_type === 'open_water'} 
        class:classroom={reservation.type === 'Classroom' || reservation.res_type === 'classroom'}>
    {reservation.type || 
     (reservation.res_type === 'pool' ? 'Pool' : 
      reservation.res_type === 'open_water' ? 'Open Water' : 
      reservation.res_type === 'classroom' ? 'Classroom' : 
      reservation.res_type || 'Unknown')}
  </span>
  <span class="status-badge" 
        class:confirmed={canonicalStatus === 'confirmed'} 
        class:pending={canonicalStatus === 'pending'} 
        class:rejected={canonicalStatus === 'rejected'}>
    {displayStatus}
  </span>
</div>

<style>
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

  .type-badge.pool {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .type-badge.openwater {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .type-badge.classroom {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.confirmed {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .status-badge.pending {
    background: rgba(245, 158, 11, 0.1);
    color: #d97706;
  }

  .status-badge.rejected {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

</style>
