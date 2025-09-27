<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../utils/supabase';
  import { auth } from '../stores/auth';

  let loading = true;

  onMount(async () => {
    try {
      // If we already have a session, go straight to the dashboard
      const current = await supabase.auth.getSession();
      if (current.data.session) {
        await auth.redirectToRoleDashboard();
        return;
      }

      // Only attempt exchange if we actually have a code in the URL
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.has('code') || url.hash.includes('code=');
      if (!hasCode) {
        window.location.replace('/');
        return;
      }

      // Exchange the authorization code in the URL for a session (PKCE flow)
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (exchangeError || !data.session) {
        window.location.replace('/');
        return;
      }
      await auth.redirectToRoleDashboard();
    } catch (e) {
      // Silent fallback
      window.location.replace('/');
    } finally {
      loading = false;
    }
  });
</script>

<main class="superhome-login-background" data-theme="superhome">
  <div class="auth-message" aria-live="polite">Authenticating...</div>
  
</main>

<style>
  .auth-message { color: #fff; text-align: center; padding: 2rem; }
</style>
