<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../../../lib/utils/supabase';
  // Note: we intentionally avoid any slow role checks here to keep callback fast

  let loading = true;
  let completed = false;

  function cleanCallbackUrl() {
    try {
      const { pathname, search } = window.location;
      const clean = pathname + (search || '');
      if (window.location.hash) {
        history.replaceState(null, '', clean);
      }
    } catch {}
  }

  onMount(async () => {
    try {
      // Final safety: if nothing completes in 6s, navigate home to avoid spinner stall
      const safety = setTimeout(() => {
        if (!completed) {
          window.location.replace('/');
        }
      }, 6000);

      // Do NOT clean hash yet; we may need to read code/access_token from it

      // If we already have a session, go straight to the app
      const current = await supabase.auth.getSession();
      if (current.data.session) {
        completed = true;
        clearTimeout(safety);
        window.location.replace('/');
        return;
      }

      // Fallback: poll for session for up to 5 seconds, to catch detectSessionInUrl async handling
      const start = Date.now();
      const waitForSession = async (): Promise<boolean> => {
        const { data } = await supabase.auth.getSession();
        return Boolean(data.session);
      };
      let gotSession = await waitForSession();
      if (!gotSession) {
        while (!gotSession && Date.now() - start < 5000) {
          // small delay
          await new Promise((r) => setTimeout(r, 200));
          gotSession = await waitForSession();
        }
      }
      if (gotSession) {
        cleanCallbackUrl();
        completed = true;
        clearTimeout(safety);
        window.location.replace('/');
        return;
      }

      // Only attempt exchange if we actually have a code in the URL (or need to normalize from hash)
      const urlNow = new URL(window.location.href);
      let hasCode = urlNow.searchParams.has('code');
      // Some providers may put code in the hash if not strictly using PKCE; normalize if present
      if (!hasCode && window.location.hash.includes('code=')) {
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const code = hashParams.get('code');
        if (code) {
          urlNow.searchParams.set('code', code);
          history.replaceState(null, '', urlNow.pathname + '?' + urlNow.searchParams.toString());
          // Clean any remaining hash
          cleanCallbackUrl();
          hasCode = true;
        }
      }

      // Legacy implicit flow fallback: if no code but access_token in hash, set session directly
      if (!hasCode && window.location.hash.includes('access_token=')) {
        const hash = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const expires_in = Number(hashParams.get('expires_in') || '0');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          cleanCallbackUrl();
          window.location.replace('/');
          return;
        }
      }
      if (!hasCode) {
        completed = true;
        clearTimeout(safety);
        window.location.replace('/');
        return;
      }

      // Exchange the authorization code in the URL for a session (PKCE flow)
      const withTimeout = <T>(p: Promise<T>, ms = 10000) =>
        Promise.race([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]);

      const exchangeRes = await withTimeout(
        supabase.auth.exchangeCodeForSession(window.location.href),
        10000
      ) as { data: { session: unknown } };

      if (!exchangeRes?.data?.session) {
        completed = true;
        clearTimeout(safety);
        window.location.replace('/');
        return;
      }

      // Ensure URL is clean before final navigation
      cleanCallbackUrl();

      // Redirect to home (role-based routing can happen after landing)
      completed = true;
      clearTimeout(safety);
      window.location.replace('/');
    } catch (e) {
      // Silent fallback
      completed = true;
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
