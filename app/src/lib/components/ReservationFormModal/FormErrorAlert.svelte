<script lang="ts">
  export let submitError: string | null = null;
</script>

{#if submitError}
  <div class="alert alert-error mb-3 text-sm">
    <span>{submitError}</span>
  </div>
{/if}
