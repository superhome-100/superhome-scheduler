<script lang="ts">
  import { sidebarActions } from '../../stores/sidebar';

  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const handleSignOut = () => {
    sidebarActions.openSignOutModal();
  };
</script>

<div class="user-profile-container flex items-center bg-gray-50 p-3 rounded-md gap-x-6">
  <!-- Avatar Column -->
  <div class="flex-shrink-0">
    {#if userAvatarUrl}
      <img src={userAvatarUrl} alt="Profile" class="w-[30px] h-[30px] rounded-full" />
    {:else}
      <div class="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
        <span class="text-sm font-semibold">{userInitial}</span>
      </div>
    {/if}
  </div>

  <!-- Name/Email Column -->
  <div class="flex-1 min-w-0 flex flex-col text-start">
    <span class="font-bold text-[12px] user-name">{userName}</span>
    <span class="text-[10px] user-email">{userEmail}</span>
  </div>

  <!-- Logout Button Column -->
  <div class="flex-shrink-0">
    <button 
      class="btn btn-error btn-sm"
      on:click={handleSignOut}
      title="Logout"
      aria-label="Sign out"
    >
      <!-- Replace with your icon, e.g. DaisyUI/FontAwesome -->
      <svg viewBox="0 0 24 24" width="8px" height="8px" fill="currentColor">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
      </svg>
    </button>
  </div>
</div>


<style>
  .user-name,
  .user-email {
    color: #00294C !important;
  }
  
  /* Ensure the component styling is applied */
  :global(.sidebar-footer) .user-profile-container {
    background-color: #e9ecef !important; /* bg-base-300 equivalent */
    padding: 12px !important;
    border-radius: 6px !important;
    gap: 15px !important;
  }
</style>

