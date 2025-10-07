<script lang="ts">
  import '../styles/theme.css';
  import '../app.css';
  import '../styles/tailwind-utilities.css';
  import Sidebar from '../lib/components/Sidebar/Sidebar.svelte';
  import { authStore, auth } from '../lib/stores/auth';
  import { onMount } from 'svelte';
  import { getUserInfo } from '../lib/stores/sidebar';
  import { page } from '$app/stores';

  let isAdmin = false;
  let checked = false;
  let signingOut = false;

  // Use reactive authStore for user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } = getUserInfo($authStore));

  onMount(async () => {
    // Wait for auth to be determined
    if ($authStore.loading) return;

    // If unauthenticated, simply mark as checked and allow public routes to render
    if (!$authStore.user) {
      checked = true;
      return;
    }

    // Authenticated: check admin status
    try {
      isAdmin = await auth.isAdmin();
      checked = true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      checked = true;
    }
  });

  // Define public routes where unauthenticated users should see the slot (e.g., login page)
  $: currentPath = $page.url.pathname;
  $: isPublicRoute = currentPath === '/' || currentPath === '/login' || currentPath === '/signup' || currentPath === '/auth/callback';

  // If we land on the callback route and are already authenticated, ensure we navigate to home
  $: if ($page.url.pathname === '/auth/callback' && $authStore.user) {
    if (typeof window !== 'undefined') window.location.replace('/');
  }

  async function handleSignOut() {
    if (signingOut) return;
    signingOut = true;
    await auth.signOut();
    window.location.replace('/');
  }

  // Check if current route needs sidebar
  $: needsSidebar = $page.url.pathname !== '/login' && $page.url.pathname !== '/signup' && $page.url.pathname !== '/auth/callback';
</script>

{#if checked}
  {#if $authStore.user}
    {#if needsSidebar}
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
      <!-- No sidebar for login/signup pages -->
      <slot />
    {/if}
  {:else}
    {#if isPublicRoute}
      <!-- Allow public routes to render their content (e.g., login page) -->
      <slot />
    {:else}
      <div class="min-h-screen flex items-center justify-center">
        <div class="alert alert-warning max-w-md">
          <span>Please log in to access the application.</span>
          <a class="link link-primary" href="/">Go to login</a>
        </div>
      </div>
    {/if}
  {/if}
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <span class="loading loading-spinner loading-lg" aria-label="Loading..."></span>
  </div>
{/if}