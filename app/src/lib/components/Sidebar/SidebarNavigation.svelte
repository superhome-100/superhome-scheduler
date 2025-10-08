<script lang="ts">
  import { page } from '$app/stores';

  export let isAdmin: boolean = false;
</script>

{#if isAdmin}
  <li>
    <a 
      class="sidebar-nav-button btn btn-ghost w-full justify-start text-left {$page.url.pathname === '/admin' ? 'active' : ''}"
      href="/admin"
    >
      Admin Dashboard
    </a>
  </li>
  <li>
    <a 
      class="sidebar-nav-button btn btn-ghost w-full justify-start text-left {$page.url.pathname === '/admin/calendar' ? 'active' : ''}"
      href="/admin/calendar"
    >
      Calendar
    </a>
  </li>
  <li>
    <a 
      class="sidebar-nav-button btn btn-ghost w-full justify-start text-left {$page.url.pathname === '/admin/users' ? 'active' : ''}"
      href="/admin/users"
    >
      User Management
    </a>
  </li>
{:else}
  <li>
    <a 
      class="sidebar-nav-button btn btn-ghost w-full justify-start text-left {$page.url.pathname === '/' ? 'active' : ''}"
      href="/"
    >
      Dashboard
    </a>
  </li>
  <li>
    <a 
      class="sidebar-nav-button btn btn-ghost w-full justify-start text-left {$page.url.pathname === '/reservation' ? 'active' : ''}"
      href="/reservation"
    >
      Reservations
    </a>
  </li>
{/if}

<style>
  :global(.sidebar-nav-button) {
    text-align: left !important;
    justify-content: flex-start !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #00294C !important; /* Primary color text */
  }
  
  :global(.sidebar-nav-button .btn) {
    text-align: left !important;
    justify-content: flex-start !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #00294C !important; /* Primary color text */
  }
  
  :global(.sidebar-nav-button:hover) {
    background-color: transparent !important;
    color: #001734 !important; /* Darker primary color on hover */
    transform: translateX(4px);
    transition: transform 0.2s ease-in-out;
  }
  
  :global(.sidebar-nav-button:active) {
    background-color: transparent !important;
    transform: translateX(2px);
    transition: transform 0.1s ease-in-out;
  }
  
  :global(.sidebar-nav-button.active) {
    background-color: #dbeafe !important; /* Light blue background for active page */
    color: #00294C !important; /* Primary color text for active page */
    font-weight: 600 !important;
    border-radius: 0.5rem !important;
    border-left: 4px solid #00294C !important; /* Primary color left border indicator */
    transform: translateX(0) !important; /* Reset transform for active state */
  }
  
  /* Focus state for accessibility */
  :global(.sidebar-nav-button:focus) {
    outline: 2px solid #00294C !important;
    outline-offset: 2px !important;
    background-color: #f3f4f6 !important;
    border-radius: 0.5rem !important;
  }
  
  /* Ensure active state overrides hover when focused */
  :global(.sidebar-nav-button.active:hover) {
    background-color: #dbeafe !important;
    color: #00294C !important;
    transform: translateX(0) !important;
  }
</style>
