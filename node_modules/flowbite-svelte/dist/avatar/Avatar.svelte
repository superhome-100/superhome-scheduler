<script>import classNames from 'classnames';
import AvatarPlaceholder from './Placeholder.svelte';
import Indicator from '../indicators/Indicator.svelte';
export let src = '';
export let href = undefined;
export let rounded = false;
export let border = false;
export let stacked = false;
export let dot = undefined;
export let alt = '';
export let size = 'md';
$: dot = dot && { placement: 'top-right', color: 'gray', size: 'lg', ...dot };
const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
    xl: 'w-36 h-36'
};
let avatarClass;
$: avatarClass = classNames(rounded ? 'rounded' : 'rounded-full', border && 'p-1 ring-2 ring-gray-300 dark:ring-gray-500', sizes[size], stacked && 'border-2 -ml-4 border-white dark:border-gray-800', 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300', $$props.class);
</script>

{#if !src || !!href || $$slots.default || dot}
  <svelte:element
    this={href ? 'a' : 'div'}
    {href}
    {...$$restProps}
    class="relative flex justify-center items-center {avatarClass}">
    {#if src}
      <img {alt} {src} class={rounded ? 'rounded' : 'rounded-full'} />
    {:else}
      <slot><AvatarPlaceholder {rounded} /></slot>
    {/if}
    {#if dot}
      <Indicator border offset={rounded} {...dot} />
    {/if}
  </svelte:element>
{:else}
  <img {alt} {src} {...$$restProps} class={avatarClass} />
{/if}
