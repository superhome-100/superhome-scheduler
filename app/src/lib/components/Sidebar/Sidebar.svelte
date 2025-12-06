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

<!-- Mobile Drawer (DaisyUI) - toggleable on mobile, hidden on lg+ where desktop aside is shown -->
<div class="drawer lg:hidden z-50">
  <input id="app-drawer" type="checkbox" class="drawer-toggle" bind:checked={$mobileDrawerOpen} />
  <div class="drawer-side">
    <!-- Overlay closes the drawer on click -->
    <label for="app-drawer" class="drawer-overlay" aria-label="close sidebar"></label>
    <!-- Sidebar panel -->
    <aside class="w-80 min-h-full bg-base-100 text-base-content border-r border-base-300 shadow-lg">
      <div class="sidebar-container">
        <!-- Sidebar Header with Close Button -->
        <div class="sidebar-header bg-base-100">
          <div class="text-xl font-semibold">
            <SidebarLogo showCloseButton={true} on:closeSidebar={sidebarActions.closeMobileDrawer} />
          </div>
        </div>

        <!-- Sidebar Content -->
        <div class="sidebar-content bg-base-100">
          <ul class="menu w-full">
            <!-- Navigation Links -->
            <SidebarNavigation {isAdmin} />
          </ul>
        </div>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer bg-base-100">
          <SidebarUserProfile 
            {userName} 
            {userEmail} 
            {userAvatarUrl} 
            {userInitial}
          />
        </div>
      </div>
    </aside>
  </div>
</div>

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

  /* Drawer styling is handled by DaisyUI + Tailwind utilities above */
</style>

