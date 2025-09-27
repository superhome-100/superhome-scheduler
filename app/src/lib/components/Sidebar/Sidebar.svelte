<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SidebarLogo from './SidebarLogo.svelte';
  import SidebarNavigation from './SidebarNavigation.svelte';
  import SidebarUserProfile from './SidebarUserProfile.svelte';
  import MobileSidebar from './MobileSidebar.svelte';

  const dispatch = createEventDispatcher();

  export let currentView: string = 'dashboard';
  export let mobileSidebarOpen: boolean = false;
  export let isAdmin: boolean = false;
  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const handleNavigate = (event: CustomEvent) => {
    dispatch('navigate', event.detail);
  };

  const handleSignOut = () => {
    dispatch('signOut');
  };

  const handleCloseMobileSidebar = () => {
    dispatch('closeMobileSidebar');
  };
</script>

<!-- Desktop Sidebar -->
<aside class="sidebar">
  <!-- Logo -->
  <SidebarLogo />

  <!-- Navigation Links -->
  <SidebarNavigation 
    {currentView} 
    {isAdmin}
    on:navigate={handleNavigate}
    on:closeMobileSidebar={handleCloseMobileSidebar}
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

<!-- Mobile Sidebar -->
<MobileSidebar 
  {mobileSidebarOpen}
  {currentView}
  {isAdmin}
  {userName}
  {userEmail}
  {userAvatarUrl}
  {userInitial}
  on:navigate={handleNavigate}
  on:signOut={handleSignOut}
  on:closeMobileSidebar={handleCloseMobileSidebar}
/>

<style>
  /* Sidebar */
  .sidebar {
    width: 288px;
    height: 100vh;
    position: sticky;
    top: 0;
    overflow-y: auto;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    padding: 1rem 1rem;
    gap: 1rem;
    flex: 0 0 288px; /* do not shrink, fixed basis */
    z-index: 30; /* above sticky headers in content */
  }


  /* Mobile Responsive */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }
  }
</style>
