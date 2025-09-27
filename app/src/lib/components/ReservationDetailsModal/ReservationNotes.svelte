<script lang="ts">
  export let reservation: any;
</script>

{#if reservation.notes}
  <div class="notes-section">
    <h3 class="notes-title">Notes</h3>
    <p class="notes-content">{reservation.notes}</p>
  </div>
{/if}

<style>
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
</style>
