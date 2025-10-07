<script lang="ts">
  import { sidebarActions } from '../../stores/sidebar';
  
  export let userName: string = 'User';
</script>

<!-- Sticky Header -->
<div class="dashboard-header">
  <div class="header-content">
    <div class="header-left">
      <!-- Mobile Menu Toggle Button -->
      <button 
        class="mobile-menu-toggle lg:hidden" 
        on:click={sidebarActions.toggleMobileDrawer}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      
      <div class="header-text">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Welcome back, {userName}!</p>
      </div>
    </div>
    
  </div>
</div>
<style>
  .dashboard-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-content {
    padding: 2rem 2rem 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 120px; /* set a fixed height */
  }

  .page-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.5rem 0;
  }

  .page-subtitle {
    font-size: 1rem;
    color: #64748b;
    margin: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-text {
    flex: 1;
  }

  /* Mobile Menu Toggle Button */
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s ease;
    margin-right: 1rem;
  }

  .mobile-menu-toggle:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  /* Mobile Responsive */
  @media (max-width: 1023px) {
    .mobile-menu-toggle {
      display: block;
    }

    .header-content {
      padding: 1rem;
      height: auto;
    }

    .page-title {
      font-size: 1.5rem;
    }

    .page-subtitle {
      font-size: 0.875rem;
    }
  }
</style>

