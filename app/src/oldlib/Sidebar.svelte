<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let currentView: string = 'dashboard';
  export let mobileSidebarOpen: boolean = false;
  export let isAdmin: boolean = false;
  export let userName: string = 'User';
  export let userEmail: string = 'user@example.com';
  export let userAvatarUrl: string | null = null;
  export let userInitial: string = 'U';

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      dispatch('closeMobileSidebar');
    }
  };

  const handleNavClick = (view: string) => {
    dispatch('navigate', { view });
    dispatch('closeMobileSidebar');
  };

  const handleSignOut = () => {
    dispatch('signOut');
  };
</script>

<!-- Desktop Sidebar -->
<aside class="sidebar">
  <!-- Logo -->
  <div class="logo-section">
    <img alt="Logo" src="/logo.png" class="logo-img"/>
    <span class="company-name">SuperHOME</span>
  </div>

  <!-- Navigation Links -->
  <ul class="nav-menu">
    {#if isAdmin}
      <li>
        <button 
          class="nav-link" 
          class:active={currentView === 'admin'} 
          on:click={() => handleNavClick('admin')}
        >
          <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zM12 7c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 6c2.7 0 5.8 1.29 6 2v1H6v-.99c.2-.72 3.3-2.01 6-2.01z"/>
          </svg>
          Admin Dashboard
        </button>
      </li>
    {/if}
    <li>
      <button 
        class="nav-link" 
        class:active={currentView === 'dashboard'} 
        on:click={() => handleNavClick('dashboard')}
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
        Dashboard
      </button>
    </li>
    <li>
      <button 
        class="nav-link" 
        class:active={currentView === 'reservation'} 
        on:click={() => handleNavClick('reservation')}
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
        Reservations
      </button>
    </li>
  </ul>

  <!-- User Profile Section -->
  <div class="user-section">
    <div class="user-profile">
      {#if userAvatarUrl}
        <img src={userAvatarUrl} alt="Profile" class="user-avatar" />
      {:else}
        <div class="user-avatar-placeholder">{userInitial}</div>
      {/if}
      <div class="user-info">
        <span class="user-name">{userName}</span>
        <span class="user-email">{userEmail}</span>
      </div>
    </div>
    <button class="logout-btn" on:click={handleSignOut} title="Logout" aria-label="Sign out">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
      </svg>
    </button>
  </div>
</aside>

<!-- Mobile Sidebar Overlay -->
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
      <div class="logo-section">
        <img alt="Logo" src="/logo.png" class="logo-img"/>
        <span class="company-name">SuperHOME</span>
        <button class="close-sidebar-btn" on:click={() => dispatch('closeMobileSidebar')} aria-label="Close sidebar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <ul class="nav-menu">
        {#if isAdmin}
          <li>
            <button 
              class="nav-link" 
              class:active={currentView === 'admin'} 
              on:click={() => handleNavClick('admin')}
            >
              <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zM12 7c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 6c2.7 0 5.8 1.29 6 2v1H6v-.99c.2-.72 3.3-2.01 6-2.01z"/>
              </svg>
              Admin Dashboard
            </button>
          </li>
        {/if}
        <li>
          <button 
            class="nav-link" 
            class:active={currentView === 'dashboard'} 
            on:click={() => handleNavClick('dashboard')}
          >
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            Dashboard
          </button>
        </li>
        <li>
          <button 
            class="nav-link" 
            class:active={currentView === 'reservation'} 
            on:click={() => handleNavClick('reservation')}
          >
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
            Reservations
          </button>
        </li>
      </ul>

      <!-- User Profile Section -->
      <div class="user-section">
        <div class="user-profile">
          {#if userAvatarUrl}
            <img src={userAvatarUrl} alt="Profile" class="user-avatar" />
          {:else}
            <div class="user-avatar-placeholder">{userInitial}</div>
          {/if}
          <div class="user-info">
            <span class="user-name">{userName}</span>
            <span class="user-email">{userEmail}</span>
          </div>
        </div>
        <button class="logout-btn" on:click={handleSignOut} title="Logout" aria-label="Sign out">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
          </svg>
        </button>
      </div>
    </aside>
  </div>
{/if}

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

  /* Logo Section */
  .logo-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
  }

  .logo-section:hover {
    background: #f1f5f9;
  }

  .logo-img {
    width: 24px;
    height: 24px;
    border-radius: 4px;
  }

  .company-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
  }

  /* Navigation Menu */
  .nav-menu {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .nav-menu li {
    margin: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    color: #64748b;
    text-decoration: none;
    transition: all 0.2s ease;
    font-size: 0.875rem;
    font-weight: 500;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }

  .nav-link:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  .nav-link.active {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .nav-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  /* User Section */
  .user-section {
    margin-top: auto;
    background: #ffffff;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-top: 1px solid #e2e8f0;
  }

  .user-profile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #e2e8f0;
  }

  .user-avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    border: 2px solid #e2e8f0;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
    gap: 0.125rem;
    align-items: flex-start;
  }

  .user-name {
    color: #1e293b;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.2;
    margin: 0;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .user-email {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.2;
    margin: 0;
    padding: 0;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    width: 100%;
  }

  .logout-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #dc2626;
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .logout-btn:hover {
    background: #b91c1c;
    transform: scale(1.05);
  }

  .logout-btn:active {
    transform: scale(0.95);
  }

  .logout-btn:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
  }

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

  .close-sidebar-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    margin-left: auto;
  }

  .close-sidebar-btn:hover {
    background: #f1f5f9;
    color: #1e293b;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }
  }
</style>
