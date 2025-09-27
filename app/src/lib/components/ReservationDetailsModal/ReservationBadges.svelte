<script lang="ts">
  export let reservation: any;
</script>

<div class="badges">
  <span class="type-badge" class:pool={reservation.type === 'Pool'} class:openwater={reservation.type === 'Open Water'} class:classroom={reservation.type === 'Classroom'}>
    {reservation.type}
  </span>
  <span class="status-badge" class:approved={reservation.status === 'approved'} class:pending={reservation.status === 'pending'} class:rejected={reservation.status === 'rejected'} class:completed={reservation.status === 'completed'} class:ongoing={reservation.status === 'ongoing'}>
    {reservation.status}
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

  .status-badge.approved {
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

  .status-badge.completed {
    background: rgba(59, 130, 246, 0.1);
    color: #1d4ed8;
  }

  .status-badge.ongoing {
    background: rgba(168, 85, 247, 0.1);
    color: #7c3aed;
  }
</style>
