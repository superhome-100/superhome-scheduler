<script lang="ts">
  import { sidebarActions } from '../../stores/sidebar';
  
  export let userName: string = 'User';
</script>

<style>
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
    padding-left: 0.5rem; /* 8px for mobile - reduced since we'll add gap */
  }
  
  .header-content .flex-1 {
    margin-left: 0.90rem; /* 12px gap between hamburger and text on mobile */
  }
  
  @media (min-width: 640px) {
    .header-content {
      padding-left: 1.5rem; /* 24px for small tablets */
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
      padding-left: 2rem; /* 32px for desktop */
    }
    
    .header-content .flex-1 {
      margin-left: 0; /* Remove gap on desktop */
    }
  }
  
  @media (min-width: 1280px) {
    .header-content {
      padding-left: 3rem; /* 48px for large desktop */
    }
  }
</style>

<!-- Sticky Header -->
<div class="bg-base-100 shadow-sm sticky top-0 z-10 mt-2 sm:mt-3 md:mt-4">
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
        <h1 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2" style="color: #00294C;">Dashboard</h1>
        <p class="text-sm sm:text-base mb-2 sm:mb-3 md:mb-4" style="color: #00294C;">Welcome back, {userName}!</p>
      </div>
    </div>
  </div>
</div>

