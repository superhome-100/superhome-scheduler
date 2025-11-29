<script lang="ts">
  import { authStore, auth } from '../../lib/stores/auth';
  import PageHeader from '../../lib/components/Layout/PageHeader.svelte';
  import MainContainer from '../../lib/components/Layout/MainContainer.svelte';
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
    <!-- Reservation content - reuse shared header and container like admin pages -->
    <PageHeader title="Reservations" subtitle="Manage your reservations" />
    <MainContainer constrain={true} padding={false}>
      <slot />
    </MainContainer>
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