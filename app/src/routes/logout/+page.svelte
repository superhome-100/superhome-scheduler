<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/utils/supabase';

  onMount(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore
    } finally {
      // Always send user to the login page after attempting sign out
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  });
</script>

<main class="p-6 text-center">
  <p>Signing you out...</p>
</main>
