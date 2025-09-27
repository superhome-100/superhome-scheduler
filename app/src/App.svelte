<script lang="ts">
  import './styles/login.css';
  import { authStore, auth } from './lib/stores/auth';
  import Login from './lib/components/Login.svelte';
  import Dashboard from './lib/components/Dashboard/Dashboard.svelte';
  import AuthCallback from './lib/components/AuthCallback.svelte';
  // Note: LoadingSpinner not used in minimal auth flow

  // Check if we're on the auth callback route
  const isAuthCallback = window.location.pathname === '/auth/callback';
  let pathname = window.location.pathname;

  // Refresh functionality
  let refreshing = false;

  const handleRefresh = async () => {
    refreshing = true;
    try {
      // Minimal behavior: reload the page to reflect latest session
      window.location.reload();
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

  // Redirect admin users to /admin after login (async check)
  async function maybeRedirectAdmin() {
    if (isAuthCallback) return;
    if (!$authStore.user) return;
    if (pathname === '/admin') return;
    const isAdmin = await auth.isAdmin();
    if (isAdmin) window.location.replace('/admin');
  }

  $: $authStore.user && maybeRedirectAdmin();
</script>

{#if isAuthCallback}
  <AuthCallback />
{:else if $authStore.user}
  <Dashboard />
{:else}
  <Login 
    {refreshing}
    on:refresh={handleRefresh}
    on:privacyPolicy={handlePrivacyPolicy}
  />
{/if}
