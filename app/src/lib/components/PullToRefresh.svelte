<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import LoadingSpinner from "./LoadingSpinner.svelte";

  export let onRefresh: () => Promise<void>;
  export let refreshing = false;
  export let overlay: boolean = true;
  export let useLoginBackground: boolean = false;

  const dispatch = createEventDispatcher();

  let startX = 0;
  let startY = 0;
  let currentY = 0;
  let pullDistance = 0;
  let isPulling = false;
  let container: HTMLElement;

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  function handleTouchStart(event: TouchEvent) {
    // Only allow pulling if we are at the top of the container
    // AND the container's top is visible at the top of the scroll area/viewport.
    const rect = container.getBoundingClientRect();

    // threshold: allow pull to refresh only if we're near the top of the container
    // and the container itself hasn't been scrolled out of view.
    // If container.scrollTop is 0 and its top is within 100px of viewport top (allowing for headers)
    if (container.scrollTop <= 0 && rect.top >= -5 && !refreshing) {
      startY = event.touches[0].clientY;
      startX = event.touches[0].clientX;
      isPulling = true;
    }
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isPulling || refreshing) return;

    currentY = event.touches[0].clientY;
    const currentX = event.touches[0].clientX;
    const deltaX = Math.abs(currentX - startX);
    const deltaY = currentY - startY;

    // If we're early in the gesture and moving more horizontally than vertically, stop pulling
    if (deltaY > 0 && deltaY < 10 && deltaX > deltaY) {
      isPulling = false;
      return;
    }

    pullDistance = Math.min(Math.max(deltaY, 0), MAX_PULL_DISTANCE);

    if (pullDistance > 0) {
      // Prevent browser scroll only when we are actually pulling down
      if (event.cancelable) {
        event.preventDefault();
      }
      container.style.transform = `translateY(${pullDistance * 0.5}px)`;
    }
  }

  async function handleTouchEnd() {
    if (!isPulling) return;

    isPulling = false;
    container.style.transform = "";
    container.style.transition =
      "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)";

    if (pullDistance > PULL_THRESHOLD && !refreshing) {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Pull to refresh error:", error);
      }
    }

    setTimeout(() => {
      if (container) {
        container.style.transition = "";
      }
      pullDistance = 0;
    }, 300);
  }

  // Add passive event listeners for better mobile performance
  onMount(() => {
    if (container) {
      // Use non-passive touchmove to allow preventDefault for pull-down action
      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
    }
  });

  onDestroy(() => {
    if (container) {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    }
  });
</script>

<div class="pull-to-refresh-container" bind:this={container}>
  {#if pullDistance > 0 && !refreshing}
    <div
      class="refresh-indicator"
      class:active={pullDistance > PULL_THRESHOLD}
      class:login-background={useLoginBackground}
    >
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
      variant={overlay ? "overlay" : "default"}
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
    /* Fill available height from parent rather than forcing viewport height */
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* Allow horizontal panning for tables/content inside ptr */
    touch-action: pan-x pan-y;
    overscroll-behavior-y: contain;
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
    color: #4a90e2;
    font-weight: 500;
    z-index: 10;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .refresh-indicator.active {
    color: #4a90e2;
  }

  .refresh-indicator.login-background {
    background: linear-gradient(
      135deg,
      #000f26 0%,
      #001734 25%,
      #003257 50%,
      #00294c 75%,
      #011129 100%
    );
    color: white;
  }

  .refresh-indicator.login-background.active {
    color: #4a90e2;
  }

  .pull-icon,
  .release-icon {
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
    /* Allow content to size naturally inside the scroll container */
    min-height: 0;
  }
</style>
