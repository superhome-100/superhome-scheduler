<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const toggleMobileSidebar = () => {
    dispatch('toggleMobileSidebar');
  };
</script>

<!-- Sticky Header -->
<div class="reservation-header">
  <div class="header-content">
    <div class="header-left">
      <button class="mobile-menu-toggle" on:click={toggleMobileSidebar} aria-label="Toggle menu">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      </button>
      <div class="header-text">
        <h1 class="page-title">Reservations</h1>
        <p class="page-subtitle">Manage your reservations</p>
      </div>
    </div>
  </div>
</div>

<style>
  .reservation-header {
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
    height: 120px;
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .header-text {
    flex: 1;
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
  @media (max-width: 768px) {
    .mobile-menu-toggle {
      display: block;
    }
  }
</style>
