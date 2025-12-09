// Svelte action to auto-fit font size within container width
export default function autoFit(
  node: HTMLElement,
  params: { min?: number; max?: number; step?: number } = {}
) {
  const { min = 10, max = 16, step = 0.5 } = params;
  let current = Math.min(parseFloat(getComputedStyle(node).fontSize || '14'), max);

  const fit = () => {
    current = Math.min(current, max);
    node.style.fontSize = current + 'px';
    let guard = 0;
    while (node.scrollWidth > node.clientWidth && current > min && guard < 100) {
      current -= step;
      node.style.fontSize = current + 'px';
      guard++;
    }
  };

  const ro = new ResizeObserver(() => fit());
  ro.observe(node);
  const mo = new MutationObserver(() => fit());
  mo.observe(node, { childList: true, characterData: true, subtree: true });
  queueMicrotask(fit);

  return {
    destroy() {
      ro.disconnect();
      mo.disconnect();
    }
  };
}
