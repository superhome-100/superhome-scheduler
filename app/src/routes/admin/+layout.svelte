<script lang="ts">
  import Sidebar from '../../lib/components/Sidebar/Sidebar.svelte';
  import AdminHeader from '../../lib/components/AdminDashboard/AdminHeader.svelte';
  import { authStore, auth } from '../../lib/stores/auth';
  import { onMount } from 'svelte';
  import { getUserInfo } from '../../lib/stores/sidebar';

  let isAdmin = false;
  let checked = false;
  let signingOut = false;

  // Use reactive authStore for user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } = getUserInfo($authStore));

  onMount(async () => {
    console.log('Admin Layout: Initializing...');
    
    // Wait for auth to be determined with timeout
    const authTimeout = setTimeout(() => {
      if ($authStore.loading) {
        console.warn('Admin Layout: Auth loading timeout, proceeding anyway');
        checked = true;
        isAdmin = false;
      }
    }, 5000); // 5 second timeout

    // Wait for auth to be determined
    if ($authStore.loading) {
      console.log('Admin Layout: Waiting for auth...');
      return;
    }
    
    clearTimeout(authTimeout);
    
    if (!$authStore.user) {
      console.log('Admin Layout: No user, redirecting to home');
      window.location.replace('/');
      return;
    }
    
    try {
      console.log('Admin Layout: Checking admin status...');
      isAdmin = await auth.isAdmin();
      console.log('Admin Layout: Admin status:', isAdmin);
      checked = true;
    } catch (error) {
      console.error('Admin Layout: Error checking admin status:', error);
      checked = true;
      isAdmin = false;
    }
  });

  // Watch for auth state changes
  $: if (!$authStore.loading && !$authStore.user && checked) {
    console.log('Admin Layout: User logged out, redirecting to home');
    window.location.replace('/');
  }

  // Debug auth state changes
  $: console.log('Admin Layout: Auth state changed:', {
    loading: $authStore.loading,
    user: $authStore.user ? 'authenticated' : 'not authenticated',
    checked,
    isAdmin
  });

  async function handleSignOut() {
    if (signingOut) return;
    signingOut = true;
    await auth.signOut();
    window.location.replace('/');
  }
</script>

{#if checked}
  {#if isAdmin}
    <div class="dashboard-container">
      <div class="drawer lg:drawer-open dashboard-layout">
        <!-- Sidebar for desktop and mobile drawer -->
        <Sidebar isAdmin={true} {userName} {userEmail} {userAvatarUrl} {userInitial} on:signOut={handleSignOut} />

        <!-- Main content area -->
        <main class="drawer-content main-content">
          <AdminHeader />
          <div class="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <slot />
          </div>
        </main>
      </div>
    </div>
  {:else}
    <div class="min-h-screen flex items-center justify-center">
      <div class="alert alert-warning max-w-md">
        <span>You don't have access to the Admin Dashboard.</span>
        <a class="link link-primary" href="/">Go back</a>
      </div>
    </div>
  {/if}
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <span class="loading loading-spinner loading-lg" aria-label="Loading admin..."></span>
  </div>
{/if}

<style>
  .dashboard-container {
    height: 100vh;
    background: #f8fafc;
    overflow: hidden; /* prevent body + inner double scroll */
  }

  .dashboard-layout {
    display: flex;
    height: 100vh;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0; /* allow child scroll container to size */
    overflow: hidden; /* only inner content scrolls */
    margin-left: 0; /* No margin on mobile */
  }

  /* Desktop: Add left margin to account for fixed sidebar (w-80 = 20rem) */
  @media (min-width: 1024px) {
    .main-content {
      margin-left: 20rem; /* 320px - matches sidebar width */
    }
  }
</style>
