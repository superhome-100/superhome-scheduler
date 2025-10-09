<script lang="ts">
  import AdminHeader from '../../lib/components/AdminDashboard/AdminHeader.svelte';
  import { authStore, auth } from '../../lib/stores/auth';
  import { onMount } from 'svelte';

  let isAdmin = false;
  let checked = false;

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
</script>

{#if checked}
  {#if isAdmin}
    <!-- Admin content - Sidebar is handled by parent layout -->
    <AdminHeader />
    <div class="p-4 sm:p-6 lg:p-8">
      <div class="max-w-7xl w-full mx-auto">
        <slot />
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
