<script lang="ts">
  import { uiLoading } from '../stores/ui';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { derived } from 'svelte/store';

  const state = derived(uiLoading, ($s) => $s);
</script>

{#if $state.active}
  <LoadingSpinner variant="overlay" text={$state.text ?? 'Loading...'} zIndex={$state.zIndex ?? 60} />
{/if}
