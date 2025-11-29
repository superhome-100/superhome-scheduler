<script lang="ts">
  import { sidebarActions } from '../../stores/sidebar';
  import { themeStore } from '../../stores/theme';
  export let title: string;
  export let subtitle: string = '';

  const handleToggleTheme = () => {
    themeStore.toggle();
  };
</script>

<style>
  .page-header {
    background: hsl(var(--b1));
    border-bottom: 1px solid hsl(var(--b3));
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
    background-color: hsl(var(--b2));
    color: hsl(var(--bc));
  }
  .mobile-menu-button:active {
    background-color: hsl(var(--b3));
    color: hsl(var(--bc));
  }

  .header-content { padding-left: 0; }
  .header-content .flex-1 { margin-left: 0.90rem; }

  @media (min-width: 640px) {
    .header-content { padding-left: 0; }
    .header-content .flex-1 { margin-left: 0.75rem; }
  }
  @media (min-width: 768px) {
    .header-content .flex-1 { margin-left: 1rem; }
  }
  @media (min-width: 1024px) {
    .mobile-menu-button { display: none !important; }
    .header-content { padding-left: 0; }
    .header-content .flex-1 { margin-left: 0; }
  }
  @media (min-width: 1280px) {
    .header-content { padding-left: 0; }
  }
</style>

<div class="page-header">
  <div class="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 xl:px-10 xl:py-6 2xl:px-12 2xl:py-6 max-w-7xl mx-auto w-full">
    <div class="flex items-center justify-between gap-4 header-content">
      <button
        class="mobile-menu-button transition-all duration-200 p-2 rounded-lg text-base-content"
        on:click={sidebarActions.toggleMobileDrawer}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>
      <div class="flex-1">
        <h1 class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 text-base-content">{title}</h1>
        {#if subtitle}
          <p class="text-sm sm:text-base text-base-content/80">{subtitle}</p>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-ghost btn-sm normal-case"
          on:click={handleToggleTheme}
        >
          {#if $themeStore === 'superhome'}
            Dark mode
          {:else}
            Light mode
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
