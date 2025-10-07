<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, auth } from '../../lib/stores/auth';
  import AdminDashboard from '../../lib/components/AdminDashboard/AdminDashboard.svelte';
  import LoadingSpinner from '../../lib/components/LoadingSpinner.svelte';
  import { goto } from '$app/navigation';

  let isAdmin = false;
  let adminChecked = false;

  onMount(async () => {
    try {
      isAdmin = await auth.isAdmin();
      if (!isAdmin) {
        // Redirect non-admin users to dashboard
        goto('/');
      }
    } finally {
      adminChecked = true;
    }
  });
</script>

{#if !adminChecked}
  <div class="min-h-screen flex items-center justify-center">
    <LoadingSpinner 
      size="lg" 
      text="Checking permissions..." 
      variant="login"
    />
  </div>
{:else if !isAdmin}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p class="text-gray-600 mb-4">You don't have permission to access this page.</p>
      <button 
        class="btn btn-primary"
        on:click={() => goto('/')}
      >
        Go to Dashboard
      </button>
    </div>
  </div>
{:else}
  <AdminDashboard />
{/if}