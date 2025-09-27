<script lang="ts">
  export let showCloseButton: boolean = false;
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const closeSidebar = () => {
    dispatch('closeSidebar');
  };
</script>

<div class="logo-section">
  <img alt="Logo" src="/logo.png" class="logo-img"/>
  <span class="company-name">SuperHOME</span>
  {#if showCloseButton}
    <button class="close-sidebar-btn" on:click={closeSidebar} aria-label="Close sidebar">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  {/if}
</div>

<style>
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
</style>
