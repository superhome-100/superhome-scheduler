<script lang="ts">
  export let submitError: string | null = null;
</script>

{#if submitError}
  <div class="error-alert">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
    {submitError}
  </div>
{/if}

<style>
  .error-alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    border: 1px solid #fecaca;
  }
</style>
