type PtrOptions = {
  onRefresh: () => Promise<void> | void;
  thresholdPx?: number;
};

export function pullToRefresh(node: HTMLElement, options: PtrOptions) {
  let startY: number | null = null;
  let pulling = false;
  const threshold = options.thresholdPx ?? 60;

  function onTouchStart(e: TouchEvent) {
    if (node.scrollTop !== 0) return;
    startY = e.touches[0].clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (startY === null) return;
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      pulling = true;
      // Optionally, we could add a transform for feedback
    }
  }

  async function onTouchEnd(e: TouchEvent) {
    if (startY === null) return;
    const endY = e.changedTouches[0].clientY;
    const delta = endY - startY;
    startY = null;
    if (pulling && delta >= threshold) {
      try {
        await options.onRefresh();
      } finally {
        pulling = false;
      }
    } else {
      pulling = false;
    }
  }

  node.addEventListener("touchstart", onTouchStart, { passive: true });
  node.addEventListener("touchmove", onTouchMove, { passive: true });
  node.addEventListener("touchend", onTouchEnd, { passive: true });

  return {
    destroy() {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    },
  };
}


