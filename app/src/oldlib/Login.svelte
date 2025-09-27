<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { auth } from './auth';
  import PullToRefresh from './PullToRefresh.svelte';

  // Event dispatcher for parent component communication
  const dispatch = createEventDispatcher<{
    refresh: void;
    privacyPolicy: void;
  }>();

  // Props
  export let refreshing = false;

  // Local state
  let isLoading = false;
  let errorMessage: string | null = null;
  $: isDisabled = isLoading;

  // Event handlers
  const handleRefresh = async (): Promise<void> => {
    dispatch('refresh');
  };

  const handleGoogleLogin = async (): Promise<void> => {
    if (isDisabled) return;
    
    isLoading = true;
    try {
      const { error } = await auth.signInWithGoogle();
      if (error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  };

  const handleFacebookLogin = async (): Promise<void> => {
    if (isDisabled) return;
    
    isLoading = true;
    try {
      const { error } = await auth.signInWithFacebook();
      if (error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  };

  const handlePrivacyPolicy = (): void => {
    dispatch('privacyPolicy');
  };
  </script>

  <PullToRefresh onRefresh={handleRefresh} {refreshing} useLoginBackground={true}>
    <main class="login-container" data-theme="superhome">
      <div class="login-card">
        <!-- Wave Icon -->
        <div class="wave-icon" aria-hidden="true"></div>
        
        <!-- App Title -->
        <header class="login-header">
          <h1 class="app-title">SuperHOME Scheduler</h1>
          <p class="app-subtitle">Sign in to begin your journey</p>
        </header>

        <!-- Login Section -->
        <section class="login-section" aria-label="Authentication options">
          {#if errorMessage}
            <div class="error-message" role="alert" aria-live="polite">{errorMessage}</div>
          {/if}
          
          <div class="button-container">
            <!-- Google Login Button -->
            <button 
              type="button"
              class="login-btn google-btn" 
              on:click={handleGoogleLogin}
              disabled={isDisabled}
              aria-label="Sign in with Google"
            >
              <svg class="provider-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <!-- Facebook Login Button -->
            <button 
              type="button"
              class="login-btn facebook-btn" 
              on:click={handleFacebookLogin}
              disabled={isDisabled}
              aria-label="Sign in with Facebook"
            >
              <svg class="provider-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        </section>

        <!-- Footer -->
        <footer class="login-footer">
          <p class="privacy-text">
            <button 
              type="button"
              class="privacy-link" 
              on:click={handlePrivacyPolicy}
              aria-label="View Privacy Policy"
            >
              Privacy Policy
            </button>
          </p>
        </footer>
      </div>
    </main>
  </PullToRefresh>

<style>
  @import '../styles/login.css';
</style>
