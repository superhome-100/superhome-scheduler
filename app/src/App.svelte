<script lang="ts">
  import './styles/login.css';
  import { authStore, auth, ensureUserProfile } from './lib/stores/auth';
  import Login from './lib/components/Login.svelte';
  import Dashboard from './lib/components/Dashboard/Dashboard.svelte';
  import AuthCallback from './lib/components/AuthCallback.svelte';
  import LoadingSpinner from './lib/components/LoadingSpinner.svelte';
  

  // Check if we're on the auth callback route
  const isAuthCallback = window.location.pathname === '/auth/callback';
  let pathname = window.location.pathname;

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

  $: {
    // Keep pathname reactive if location changes
    pathname = window.location.pathname;
  }

  // Note: Admin users can manually navigate to /admin via the sidebar
  // No automatic redirect to prevent page reloads
</script>

<div data-theme="superhome">
  {#if isAuthCallback}
    <AuthCallback />
  {:else if $authStore.loading}
    <LoadingSpinner 
      size="lg" 
      text="Loading..." 
      variant="login"
    />
  {:else if $authStore.user}
    <Dashboard />
  {:else}
    <Login 
      {refreshing}
      on:refresh={handleRefresh}
      on:privacyPolicy={handlePrivacyPolicy}
    />
  {/if}
</div>
