<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { mobileDrawerOpen, sidebarActions, showSignOutModal } from '../../stores/sidebar';
  import { auth } from '../../stores/auth';
  import SidebarLogo from './SidebarLogo.svelte';
  import SidebarNavigation from './SidebarNavigation.svelte';
  import SidebarUserProfile from './SidebarUserProfile.svelte';
  import SignOutModal from '../Dashboard/SignOutModal.svelte';

  const dispatch = createEventDispatcher();

  export let isAdmin: boolean = false;
  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const handleSignOutConfirm = async () => {
    sidebarActions.closeSignOutModal();
    await auth.signOut();
  };

  const handleOverlayClick = () => {
    sidebarActions.closeMobileDrawer();
  };
</script>

<!-- Desktop Sidebar - Always visible on desktop -->
<aside class="w-80 bg-base-100 text-base-content border-r border-base-300 hidden lg:block fixed top-0 left-0 h-screen z-50 overflow-hidden">
  <div class="sidebar-container">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="text-xl font-semibold">
        <SidebarLogo />
      </div>
    </div>
    
    <!-- Sidebar Content -->
    <div class="sidebar-content">
      <ul class="menu w-full">
        <!-- Navigation Links -->
        <SidebarNavigation 
          {isAdmin}
        />
      </ul>
    </div>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <SidebarUserProfile 
        {userName} 
        {userEmail} 
        {userAvatarUrl} 
        {userInitial}
      />
    </div>
  </div>
</aside>

<!-- Mobile Drawer - Only visible when open on mobile -->
{#if $mobileDrawerOpen}
  <aside class="mobile-sidebar w-80 bg-base-100 text-base-content lg:hidden fixed top-0 left-0 h-full z-50 border-r border-base-300">
    <div class="sidebar-container">
      <!-- Sidebar Header with Close Button -->
      <div class="sidebar-header">
        <div class="text-xl font-semibold">
          <SidebarLogo showCloseButton={true} on:closeSidebar={sidebarActions.closeMobileDrawer} />
        </div>
      </div>
      
      <!-- Sidebar Content -->
      <div class="sidebar-content">
        <ul class="menu w-full">
          <!-- Navigation Links -->
          <SidebarNavigation 
            {isAdmin}
          />
        </ul>
      </div>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <SidebarUserProfile 
          {userName} 
          {userEmail} 
          {userAvatarUrl} 
          {userInitial}
        />
      </div>
    </div>
  </aside>
{/if}

<!-- Mobile Overlay - Only visible when mobile drawer is open -->
{#if $mobileDrawerOpen}
  <div 
    class="mobile-overlay" 
    role="button"
    tabindex="0"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Enter' && handleOverlayClick()}
    aria-label="Close sidebar"
  ></div>
{/if}

<!-- Sign Out Modal -->
<SignOutModal 
  showModal={$showSignOutModal}
  on:confirm={handleSignOutConfirm}
  on:cancel={sidebarActions.closeSignOutModal}
/>

<style>
  .sidebar-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  .sidebar-header {
    flex-shrink: 0;
    padding: 1rem;
    border-bottom: 1px solid hsl(var(--b3));
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
  }

  .sidebar-footer {
    flex-shrink: 0;
    padding: 1rem;
    border-top: 1px solid hsl(var(--b3));
    margin-top: auto;
  }

  /* Mobile Sidebar Specific Styles */
  .mobile-sidebar {
    background-color: hsl(var(--b1)) !important;
    border-right: 1px solid hsl(var(--b3));
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    opacity: 1 !important; /* Ensure it's not transparent */
  }

  /* Ensure mobile sidebar content has proper background */
  .mobile-sidebar .sidebar-container {
    background-color: hsl(var(--b1)) !important;
    opacity: 1 !important;
  }

  /* Ensure all mobile sidebar elements have proper background */
  .mobile-sidebar .sidebar-header,
  .mobile-sidebar .sidebar-content,
  .mobile-sidebar .sidebar-footer {
    background-color: transparent !important;
  }

  /* Mobile Overlay */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 45;
  }

  /* Hide mobile overlay on desktop */
  @media (min-width: 1024px) {
    .mobile-overlay {
      display: none;
    }
  }
</style>

