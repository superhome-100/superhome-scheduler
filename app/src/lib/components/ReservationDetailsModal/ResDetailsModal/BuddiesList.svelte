<script lang="ts">
  export let names: string[] = [];
  // Only render non-empty names, up to two buddies
  $: filtered = (names || [])
    .map((n) => (n ?? '').trim())
    .filter((n) => n.length > 0)
    .slice(0, 2);
</script>

<div class="buddies-section">
  <h3 class="buddies-title">Buddies</h3>
  <div class="buddies-grid">
    {#each filtered as n}
      <div class="detail-item" aria-label="Buddy">
        <span class="detail-value">{n}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .buddies-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .buddies-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 0.75rem 0;
  }

  .buddies-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #1e293b;
    font-weight: 500;
    min-height: 1.25rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .buddies-section {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
    }
    .buddies-title {
      font-size: 0.75rem;
      margin-bottom: 0.375rem;
    }
    .buddies-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.25rem;
    }
    .detail-value {
      font-size: 0.6875rem;
      min-height: 1rem;
    }
  }
</style>
