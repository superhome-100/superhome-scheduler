<script lang="ts">
  import { sidebarActions } from '../../stores/sidebar';
</script>

<style>
  .admin-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .mobile-menu-button {
    display: block;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .mobile-menu-button:hover {
    background-color: rgba(0, 41, 76, 0.1);
    color: #00294C;
  }
  
  .mobile-menu-button:active {
    background-color: rgba(0, 41, 76, 0.15);
    color: #00294C;
  }
  
  .header-content {
    padding-left: 0; /* remove left padding for flush header */
  }
  
  .header-content .flex-1 {
    margin-left: 0.90rem; /* 12px gap between hamburger and text on mobile */
  }
  
  @media (min-width: 640px) {
    .header-content {
      padding-left: 0; /* keep flush on small tablets */
    }
    
    .header-content .flex-1 {
      margin-left: 0.75rem; /* 12px gap between hamburger and text on medium screens */
    }
  }
  
  @media (min-width: 768px) {
    .header-content .flex-1 {
      margin-left: 1rem; /* 16px gap for larger medium screens */
    }
  }
  
  @media (min-width: 1024px) {
    .mobile-menu-button {
      display: none !important;
    }
    
    .header-content {
      padding-left: 0; /* keep flush on desktop */
    }
    
    .header-content .flex-1 {
      margin-left: 0; /* Remove gap on desktop */
    }
  }
  
  @media (min-width: 1280px) {
    .header-content {
      padding-left: 0; /* keep flush on large desktop */
    }
  }
</style>

<!-- Sticky Header with Calendar-style outline -->
<div class="admin-header">
  <div class="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 xl:px-10 xl:py-6 2xl:px-12 2xl:py-6 max-w-7xl mx-auto w-full">
    <div class="flex items-center gap-4 header-content">
      <!-- Mobile Menu Toggle Button -->
      <button 
        class="mobile-menu-button transition-all duration-200 p-2 rounded-lg" 
        style="color: #00294C;"
        on:click={sidebarActions.toggleMobileDrawer}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      
      <div class="flex-1">
        <h1 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2" style="color: #00294C;">Admin Dashboard</h1>
        <p class="text-sm sm:text-base" style="color: #00294C;">Manage users and reservations</p>
      </div>
    </div>
  </div>
</div>
