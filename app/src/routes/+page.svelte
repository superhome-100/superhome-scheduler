<script lang="ts">
  import { authStore, auth, ensureUserProfile } from '../lib/stores/auth';
  import Login from '../lib/components/Login.svelte';
  import Dashboard from '../lib/components/Dashboard/Dashboard.svelte';
  import AuthCallback from '../lib/components/AuthCallback.svelte';
  import LoadingSpinner from '../lib/components/LoadingSpinner.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  // Check if we're on the auth callback route
  $: isAuthCallback = $page.url.pathname === '/auth/callback';
  $: pathname = $page.url.pathname;

  // Admin status check
  let isAdmin = false;
  let adminChecked = false;

  // Refresh functionality
  let refreshing = false;

  const handleRefresh = async () => {
    refreshing = true;
    try {
      // Refresh auth state without page reload
      const { data } = await auth.getSession();
      const user = data.session?.user ?? null;
      authStore.set({ user, loading: false, error: null });
      
      // If user exists, ensure profile is created
      if (user) {
        await ensureUserProfile(user);
      }
    } catch (error) {
      console.error('Refresh error:', error);
      authStore.set({ user: null, loading: false, error: 'Refresh failed' });
    } finally {
      refreshing = false;
    }
  };

  // Login handlers
  const handleGoogleLogin = async (): Promise<void> => {
    const { error } = await auth.signInWithGoogle();
    if (error) {
      console.error('Google login error:', error);
    }
  };

  const handleFacebookLogin = async (): Promise<void> => {
    const { error } = await auth.signInWithFacebook();
    if (error) {
      console.error('Facebook login error:', error);
    }
  };

  const handlePrivacyPolicy = (): void => {
    console.log('Privacy Policy clicked');
    // Add privacy policy navigation logic here
  };

  // Note: Admin users can manually navigate to /admin via the sidebar
  // No automatic redirect to prevent page reloads

  // Debug auth state changes
  $: console.log('Page: Auth state changed:', {
    loading: $authStore.loading,
    user: $authStore.user ? 'authenticated' : 'not authenticated',
    error: $authStore.error
  });

  // Fallback to handle stuck loading state
  let loadingTimeout: NodeJS.Timeout;
  $: if ($authStore.loading) {
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      authStore.update(state => ({ ...state, loading: false, error: 'Loading timeout' }));
    }, 5000); // Reduced to 5 second timeout for faster recovery
  } else {
    clearTimeout(loadingTimeout);
  }

  // Additional fallback: if we've been loading for too long, show login
  let forceShowLogin = false;
  setTimeout(() => {
    if ($authStore.loading) {
      console.warn('Page: Force showing login due to extended loading');
      forceShowLogin = true;
    }
  }, 3000); // 3 second fallback

  // Check admin status when user is authenticated
  onMount(async () => {
    if ($authStore.user && !adminChecked) {
      try {
        isAdmin = await auth.isAdmin();
        adminChecked = true;
      } catch (error) {
        console.error('Error checking admin status:', error);
        adminChecked = true;
        isAdmin = false;
      }
    }
  });

  // Watch for auth state changes and check admin status
  $: if ($authStore.user && !adminChecked && !$authStore.loading) {
    (async () => {
      try {
        isAdmin = await auth.isAdmin();
        adminChecked = true;
      } catch (error) {
        console.error('Error checking admin status:', error);
        adminChecked = true;
        isAdmin = false;
      }
    })();
  }

  // Redirect admin users to admin dashboard
  $: if (adminChecked && isAdmin && $authStore.user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }

  // Admin users can navigate to /admin via sidebar - no automatic redirect
</script>

<div data-theme="superhome">
  {#if isAuthCallback}
    <AuthCallback />
  {:else if $authStore.loading && !forceShowLogin}
    <div class="min-h-screen flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <LoadingSpinner 
          size="lg" 
          text="Loading..." 
          variant="login"
        />
        <div class="text-sm text-white/60">
          If this takes too long, check the browser console for errors
        </div>
      </div>
    </div>
  {:else if $authStore.user}
    {#if !adminChecked}
      <div class="min-h-screen flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <LoadingSpinner 
            size="lg" 
            text="Checking permissions..." 
            variant="login"
          />
        </div>
      </div>
    {:else if isAdmin}
      <!-- Admin users should be redirected to admin dashboard -->
      <div class="min-h-screen flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <LoadingSpinner 
            size="lg" 
            text="Redirecting to admin dashboard..." 
            variant="login"
          />
        </div>
      </div>
    {:else}
      <Dashboard />
    {/if}
  {:else}
    <Login 
      {refreshing}
      on:refresh={handleRefresh}
      on:privacyPolicy={handlePrivacyPolicy}
    />
  {/if}
</div>
