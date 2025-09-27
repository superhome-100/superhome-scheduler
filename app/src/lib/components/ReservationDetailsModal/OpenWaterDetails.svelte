<script lang="ts">
  export let reservation: any;
  export let owDepth: number | null = null;
  export let owAutoPair: boolean | null = null;
  export let owPairedName: string | null = null;
</script>

{#if reservation?.res_type === 'open_water' || reservation?.type === 'Open Water'}
  {#if owDepth !== null}
    <div class="detail-item">
      <span class="detail-label">Depth (m)</span>
      <span class="detail-value">{owDepth}</span>
    </div>
  {/if}
  {#if owAutoPair !== null}
    <div class="detail-item">
      <span class="detail-label">Auto Pair Selected</span>
      <span class="detail-value">{owAutoPair ? 'Yes' : 'No'}</span>
    </div>
  {/if}
  <div class="detail-item">
    <span class="detail-label">Paired With</span>
    <span class="detail-value">{owPairedName ?? 'Not paired yet'}</span>
  </div>
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
</style>
