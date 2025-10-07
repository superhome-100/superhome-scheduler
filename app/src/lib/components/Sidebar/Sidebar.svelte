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
<div class="drawer-side desktop-sidebar w-80">
  <div class="sidebar-container" data-theme="nord">
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
</div>

<!-- Mobile Drawer - Only visible when open on mobile -->
{#if $mobileDrawerOpen}
  <div class="drawer-side mobile-drawer w-80">
    <div class="sidebar-container" data-theme="nord">
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
  </div>
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
    background-color: #e9ecef; /* bg-base-300 equivalent */
    width: 100%;
  }

  .sidebar-header {
    flex-shrink: 0;
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1rem;
  }

  .sidebar-footer {
    flex-shrink: 0;
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    background-color: #e9ecef; /* bg-base-300 equivalent */
    margin-top: auto;
  }

  /* Desktop Sidebar - Always visible on desktop */
  .desktop-sidebar {
    display: none; /* Hidden on mobile by default */
  }

  @media (min-width: 1024px) {
    .desktop-sidebar {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 40;
      width: 20rem; /* Match w-80 */
    }
  }

  /* Mobile Drawer - Hidden by default, shown when mobileDrawerOpen is true */
  .mobile-drawer {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
  }

  /* Hide mobile drawer on desktop (1024px and up) */
  @media (min-width: 1024px) {
    .mobile-drawer {
      display: none !important;
    }
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

