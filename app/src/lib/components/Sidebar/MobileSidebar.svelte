<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SidebarLogo from './SidebarLogo.svelte';
  import SidebarNavigation from './SidebarNavigation.svelte';
  import SidebarUserProfile from './SidebarUserProfile.svelte';

  export let mobileSidebarOpen: boolean = false;
  export let currentView: string = 'dashboard';
  export let isAdmin: boolean = false;
  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const dispatch = createEventDispatcher();

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      dispatch('closeMobileSidebar');
    }
  };

  const handleNavigate = (event: CustomEvent) => {
    dispatch('navigate', event.detail);
  };

  const handleSignOut = () => {
    dispatch('signOut');
  };

  const handleCloseSidebar = () => {
    dispatch('closeMobileSidebar');
  };
</script>

{#if mobileSidebarOpen}
  <div 
    class="mobile-sidebar-overlay" 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && dispatch('closeMobileSidebar')}
    role="button"
    tabindex="-1"
    aria-label="Close sidebar"
  >
    <aside class="mobile-sidebar" class:open={mobileSidebarOpen}>
      <!-- Logo -->
      <SidebarLogo showCloseButton={true} on:closeSidebar={handleCloseSidebar} />

      <!-- Navigation Links -->
      <SidebarNavigation 
        {currentView} 
        {isAdmin}
        on:navigate={handleNavigate}
        on:closeMobileSidebar={handleCloseSidebar}
      />

      <!-- User Profile Section -->
      <SidebarUserProfile 
        {userName} 
        {userEmail} 
        {userAvatarUrl} 
        {userInitial}
        on:signOut={handleSignOut}
      />
    </aside>
  </div>
{/if}

<style>
  /* Mobile Sidebar Overlay */
  .mobile-sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: stretch;
  }

  /* Mobile Sidebar */
  .mobile-sidebar {
    width: 280px;
    height: 100vh;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    padding: 1rem 1rem;
    gap: 1rem;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
  }

  .mobile-sidebar.open {
    transform: translateX(0);
  }
</style>
