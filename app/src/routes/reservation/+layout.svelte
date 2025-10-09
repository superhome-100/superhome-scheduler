<script lang="ts">
  import { authStore, auth } from '../../lib/stores/auth';
  import { onMount } from 'svelte';

  let isAdmin = false;
  let checked = false;

  onMount(async () => {
    // Wait for auth to be determined
    if ($authStore.loading) return;
    
    if (!$authStore.user) {
      window.location.replace('/');
      return;
    }
    
    try {
      isAdmin = await auth.isAdmin();
      checked = true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      checked = true;
    }
  });

  // Watch for auth state changes
  $: if (!$authStore.loading && !$authStore.user && checked) {
    window.location.replace('/');
  }
</script>

{#if checked}
  {#if $authStore.user}
    <!-- Reservation content - Sidebar is handled by parent layout -->
    <div class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
      <slot />
    </div>
  {:else}
    <div class="min-h-screen flex items-center justify-center">
      <div class="alert alert-warning max-w-md">
        <span>Please log in to access reservations.</span>
        <a class="link link-primary" href="/">Go back</a>
      </div>
    </div>
  {/if}
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <span class="loading loading-spinner loading-lg" aria-label="Loading..."></span>
  </div>
{/if}