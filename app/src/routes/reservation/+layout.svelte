<script lang="ts">
  import Sidebar from '../../lib/components/Sidebar/Sidebar.svelte';
  import { authStore, auth } from '../../lib/stores/auth';
  import { onMount } from 'svelte';
  import { getUserInfo } from '../../lib/stores/sidebar';

  let isAdmin = false;
  let checked = false;
  let signingOut = false;

  // Use reactive authStore for user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } = getUserInfo($authStore));

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

  async function handleSignOut() {
    if (signingOut) return;
    signingOut = true;
    await auth.signOut();
    // Redirect is now handled by auth.signOut()
  }
</script>

{#if checked}
  {#if $authStore.user}
    <div class="min-h-screen bg-base-200">
      <div class="drawer lg:drawer-open">
        <!-- Sidebar for desktop and mobile drawer -->
        <Sidebar {isAdmin} {userName} {userEmail} {userAvatarUrl} {userInitial} on:signOut={handleSignOut} />

        <!-- Main content area -->
        <main class="drawer-content main-content">
          <div class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <slot />
          </div>
        </main>
      </div>
    </div>
  {:else}
    <div class="min-h-screen flex items-center justify-center">
      <div class="alert alert-warning max-w-md">
        <span>Please log in to access reservations.</span>
        <a class="link link-primary" href="/">Go to login</a>
      </div>
    </div>
  {/if}
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <span class="loading loading-spinner loading-lg" aria-label="Loading..."></span>
  </div>
{/if}

<style>
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0; /* allow child scroll container to size */
    overflow: hidden; /* only inner PullToRefresh scrolls */
    margin-left: 0; /* No margin on mobile */
  }

  /* Desktop: Add left margin to account for fixed sidebar (w-80 = 20rem) */
  @media (min-width: 1024px) {
    .main-content {
      margin-left: 20rem; /* 320px - matches sidebar width */
    }
  }

  /* Ensure the PullToRefresh becomes the single scroll container */
  .main-content > :global(.pull-to-refresh-container) {
    flex: 1;
    min-height: 0;
  }
</style>
