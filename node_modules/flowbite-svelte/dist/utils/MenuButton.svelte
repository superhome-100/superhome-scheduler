<script>import classNames from 'classnames';
import ToolbarButton from '../toolbar/ToolbarButton.svelte';
export let name = undefined;
export let vertical = false;
</script>

<ToolbarButton on:click {name} {...$$restProps} class={classNames($$props.class)} let:svgSize>
  <svg
    class={svgSize}
    aria-hidden="true"
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg">
    {#if vertical}
      <path
        d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    {:else}
      <path
        d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
    {/if}
  </svg>
</ToolbarButton>
