<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../../lib/utils/supabase';
  // Note: we intentionally avoid any slow role checks here to keep callback fast

  let loading = true;

  onMount(async () => {
    try {
      // If we already have a session, go straight to the dashboard
      const current = await supabase.auth.getSession();
      if (current.data.session) {
        // Fast redirect; role-based redirection occurs after landing
        window.location.replace('/');
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
      const withTimeout = <T>(p: Promise<T>, ms = 10000) =>
        Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]);

      let data: { session: unknown } | null = null;
      try {
        const res = await withTimeout(
          supabase.auth.exchangeCodeForSession(window.location.href),
          10000
        ) as { data: { session: unknown } };
        data = res?.data ?? null;
      } catch (_timeoutOrErr) {
        data = null;
      }

      if (!data || !data.session) {
        window.location.replace('/');
        return;
      }
      // Fast redirect; any role checks can run after landing
      window.location.replace('/');
    } catch (e) {
      // Silent fallback
      window.location.replace('/');
    } finally {
      loading = false;
    }
  });
</script>

<main class="superhome-login-background">
  <div class="auth-message" aria-live="polite">Authenticating...</div>
</main>

<style>
  .auth-message { color: hsl(var(--bc)); text-align: center; padding: 2rem; }
</style>
