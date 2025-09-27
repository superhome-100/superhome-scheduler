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
</style>
