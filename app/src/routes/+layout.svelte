<script lang="ts">
  import '../styles/theme.css';
  import '../app.css';
  import '../styles/tailwind-utilities.css';
  import Sidebar from '../lib/components/Sidebar/Sidebar.svelte';
  import { authStore, auth } from '../lib/stores/auth';
  import { onMount } from 'svelte';
  import { getUserInfo, sidebarActions } from '../lib/stores/sidebar';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import GlobalLoadingOverlay from '../lib/components/GlobalLoadingOverlay.svelte';
  import MainContainer from '../lib/components/Layout/MainContainer.svelte';

  let isAdmin = false;
  let checked = false;
  let signingOut = false;

  // Use reactive authStore for user info
  $: ({ userEmail, userName, userAvatarUrl, userInitial } = getUserInfo($authStore));

  // React to auth changes instead of one-time onMount to avoid getting stuck
  $: if (!$authStore.loading) {
    if (!$authStore.user) {
      checked = true;
      // Redirect unauthenticated users away from protected routes
      if (!isPublicRoute && typeof window !== 'undefined') {
        goto('/login', { replaceState: true });
      }
    } else {
      // Authenticated: check admin status (non-blocking)
      auth
        .isAdmin()
        .then((val) => {
          isAdmin = val;
          checked = true;
        })
        .catch((_e) => {
          checked = true;
        });
    }
  }

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
    // Redirect is now handled by auth.signOut()
  }

  // Check if current route needs sidebar
  $: needsSidebar = $page.url.pathname !== '/login' && $page.url.pathname !== '/signup' && $page.url.pathname !== '/auth/callback';
</script>

{#if checked}
  {#if $authStore.user}
  {#if needsSidebar}
    <!-- Sidebar for desktop and mobile drawer -->
    <Sidebar {isAdmin} {userName} {userEmail} {userAvatarUrl} {userInitial} on:signOut={handleSignOut} />
    
    <!-- Main content area using shared MainContainer -->
    <div class="main-content-wrapper">
      <!-- Page content -->
      <main class="main-scrollable p-0">
        <MainContainer constrain={true} padding={false}>
          <slot />
        </MainContainer>
      </main>
    </div>
    <!-- Global loading overlay -->
    <GlobalLoadingOverlay />
    {:else}
      <!-- No sidebar for login/signup pages -->
      <slot />
      <!-- Global loading overlay -->
      <GlobalLoadingOverlay />
    {/if}
  {:else}
    {#if isPublicRoute}
      <!-- Allow public routes to render their content (e.g., login page) -->
      <slot />
      <!-- Global loading overlay -->
      <GlobalLoadingOverlay />
    {:else}
      <div class="min-h-screen flex items-center justify-center">
        <div class="alert alert-warning max-w-md">
          <span>Please log in to access the application.</span>
          <a class="link link-primary" href="/login">Go to login</a>
        </div>
      </div>
      <!-- Global loading overlay -->
      <GlobalLoadingOverlay />
    {/if}
  {/if}
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <span class="loading loading-spinner loading-lg" aria-label="Loading..."></span>
  </div>
  <!-- Global loading overlay -->
  <GlobalLoadingOverlay />
{/if}