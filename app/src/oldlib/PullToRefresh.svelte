<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let onRefresh: () => Promise<void>;
  export let refreshing = false;
  export let overlay: boolean = true;
  export let useLoginBackground: boolean = false;

  const dispatch = createEventDispatcher();

  let startY = 0;
  let currentY = 0;
  let pullDistance = 0;
  let isPulling = false;
  let container: HTMLElement;

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  function handleTouchStart(event: TouchEvent) {
    if (container.scrollTop === 0 && !refreshing) {
      startY = event.touches[0].clientY;
      isPulling = true;
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isPulling || refreshing) return;

    currentY = event.touches[0].clientY;
    pullDistance = Math.min(Math.max(currentY - startY, 0), MAX_PULL_DISTANCE);

    if (pullDistance > 0) {
      event.preventDefault();
      container.style.transform = `translateY(${pullDistance * 0.5}px)`;
    }
  }

  async function handleTouchEnd() {
    if (!isPulling) return;

    isPulling = false;
    container.style.transform = '';
    container.style.transition = 'transform 0.3s ease';

    if (pullDistance > PULL_THRESHOLD && !refreshing) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      }
    }

    setTimeout(() => {
      if (container) {
        container.style.transition = '';
      }
      pullDistance = 0;
    }, 300);
  }

  // Add passive event listeners for better mobile performance
  onMount(() => {
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
  });

  onDestroy(() => {
    if (container) {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    }
  });
</script>

<div 
  class="pull-to-refresh-container"
  bind:this={container}
>
  {#if pullDistance > 0 && !refreshing}
    <div class="refresh-indicator" class:active={pullDistance > PULL_THRESHOLD} class:login-background={useLoginBackground}>
      {#if pullDistance > PULL_THRESHOLD}
        <div class="release-icon">↓</div>
        <span>Release to refresh</span>
      {:else}
        <div class="pull-icon">↓</div>
        <span>Pull to refresh</span>
      {/if}
    </div>
  {/if}

  {#if refreshing}
    <LoadingSpinner 
      size="md" 
      text="Refreshing..." 
      variant={overlay ? 'overlay' : 'default'}
      zIndex={40}
    />
  {/if}

  <div class="content">
    <slot />
  </div>
</div>

<style>
  .pull-to-refresh-container {
    position: relative;
    height: 100vh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    overscroll-behavior: contain;
  }

  .refresh-indicator {
    position: absolute;
    top: -60px;
    left: 0;
    right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.95);
    color: #667eea;
    font-weight: 500;
    z-index: 10;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .refresh-indicator.active {
    color: #4A90E2;
  }

  .refresh-indicator.login-background {
    background: linear-gradient(135deg, 
      #000F26 0%, 
      #001734 25%, 
      #003257 50%, 
      #00294C 75%, 
      #011129 100%);
    color: white;
  }

  .refresh-indicator.login-background.active {
    color: #4A90E2;
  }


  .pull-icon, .release-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: transform 0.2s ease;
  }

  .release-icon {
    transform: rotate(180deg);
  }

  .content {
    min-height: 100%;
  }
</style>
