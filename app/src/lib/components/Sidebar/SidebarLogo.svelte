<script lang="ts">
  export let showCloseButton: boolean = false;
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  const closeSidebar = () => {
    dispatch('closeSidebar');
  };
</script>

<div class="flex items-center justify-between gap-3 rounded-lg transition-colors duration-200 hover:bg-slate-100">
  <span class="sidebar-logo-text text-primary font-bold">SuperHOME</span>
  {#if showCloseButton}
    <button 
      class="close-button" 
      on:click={closeSidebar} 
      aria-label="Close sidebar"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  {/if}
</div>

<style>
  /* Logo styling now handled by DaisyUI theme */
  .sidebar-logo-text {
    color: #00294C !important; /* Primary color with high specificity */
  }

  .close-button {
    background: none !important;
    border: none !important;
    padding: 8px;
    cursor: pointer;
    color: #00294C !important;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: none !important;
    color: #00294C !important;
    opacity: 0.7;
  }

  .close-button:focus {
    outline: none;
    background: none !important;
  }
</style>


