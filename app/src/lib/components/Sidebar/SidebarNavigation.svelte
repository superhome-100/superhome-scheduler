<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let currentView: string = 'dashboard';
  export let isAdmin: boolean = false;

  const dispatch = createEventDispatcher();

  const handleNavClick = (view: string) => {
    dispatch('navigate', { view });
    dispatch('closeMobileSidebar');
  };
</script>

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
    <li>
      <button 
        class="nav-link admin-sub-nav" 
        class:active={currentView === 'admin-calendar'} 
        on:click={() => handleNavClick('admin-calendar')}
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
        Calendar
      </button>
    </li>
    <li>
      <button 
        class="nav-link admin-sub-nav" 
        class:active={currentView === 'admin-users'} 
        on:click={() => handleNavClick('admin-users')}
      >
        <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2.01.99L12 11l-1.99-2.01A2.5 2.5 0 0 0 8 8H5.46c-.8 0-1.54.37-2.01.99L1 15.5V22h2v-6h2.5l2.54 7.63A1.5 1.5 0 0 0 9.46 24H12c.8 0 1.54-.37 2.01-.99L16 21l1.99 2.01A2.5 2.5 0 0 0 20 24h2.5c.8 0 1.54-.37 2.01-.99L27 15.5V22h2v-6h2v6h2z"/>
        </svg>
        Users
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

<style>
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

  /* Admin sub-navigation styling */
  .admin-sub-nav {
    margin-left: 1.5rem;
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
    position: relative;
  }

  .admin-sub-nav::before {
    content: '';
    position: absolute;
    left: -1rem;
    top: 50%;
    width: 0.5rem;
    height: 1px;
    background: #cbd5e1;
    transform: translateY(-50%);
  }
</style>
