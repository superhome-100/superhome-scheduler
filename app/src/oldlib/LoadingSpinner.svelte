<script lang="ts">
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let text: string = 'Loading...';
  export let variant: 'default' | 'login' | 'overlay' = 'default';
  export let zIndex: number = 50;

  const sizeMap = {
    xs: '16px',
    sm: '20px', 
    md: '24px',
    lg: '32px',
    xl: '40px'
  };

  const spinnerSize = sizeMap[size];
</script>

{#if variant === 'overlay'}
  <div 
    class="loading-overlay"
    style="z-index: {zIndex};"
  >
    <div class="loading-content">
      <div class="spinner" style="width: {spinnerSize}; height: {spinnerSize};"></div>
      {#if text}
        <div class="loading-text">{text}</div>
      {/if}
    </div>
  </div>
{:else if variant === 'login'}
  <div class="login-loading">
    <div class="spinner login-spinner" style="width: {spinnerSize}; height: {spinnerSize};"></div>
    {#if text}
      <div class="login-loading-text">{text}</div>
    {/if}
  </div>
{:else}
  <div class="inline-loading">
    <div class="spinner" style="width: {spinnerSize}; height: {spinnerSize};"></div>
    {#if text}
      <div class="loading-text">{text}</div>
    {/if}
  </div>
{/if}

<style>
  /* Base spinner animation */
  .spinner {
    border: 2px solid transparent;
    border-top: 2px solid var(--primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Overlay variant - for main app loading */
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: var(--background, white);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-light, #e5e7eb);
  }

  .loading-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
  }

  /* Login variant - minimal, no background */
  .login-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 200px;
  }

  .login-spinner {
    border-top-color: rgba(255, 255, 255, 0.8);
    border-right-color: rgba(255, 255, 255, 0.3);
    border-bottom-color: rgba(255, 255, 255, 0.3);
    border-left-color: rgba(255, 255, 255, 0.3);
  }

  .login-loading-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }

  /* Inline variant - for small loading states */
  .inline-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
  }

  /* Dark mode support */
  :global(.dark-mode) .loading-overlay {
    background: rgba(0, 0, 0, 0.8);
  }

  :global(.dark-mode) .loading-content {
    background: var(--dark-background, #1f2937);
    border-color: var(--dark-border-light, #374151);
  }

  :global(.dark-mode) .loading-text {
    color: var(--dark-text-secondary, #9ca3af);
  }

  :global(.dark-mode) .spinner {
    border-top-color: var(--dark-primary, #60a5fa);
  }
</style>
