<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export type AdminSection = 'pending' | 'price' | 'block' | 'user_res';
  export let selected: AdminSection = 'pending';

  const dispatch = createEventDispatcher<{ select: { section: AdminSection } }>();

  const labels: Record<AdminSection, string> = {
    pending: 'Pending Reservation',
    price: 'Price Template',
    block: 'Block Reservation',
    user_res: 'User Reservations'
  };

  // Derive the remaining options excluding current selected
  $: options = (['pending', 'price', 'block', 'user_res'] as AdminSection[]).filter(
    (s) => s !== selected
  );

  let open = false;

  const setSection = (section: AdminSection) => {
    if (selected === section) {
      open = false;
      return;
    }
    selected = section;

    // Update URL query param for deep-linking without navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('section', section);
      window.history.replaceState({}, '', url.toString());
    }

    dispatch('select', { section });
    // Close dropdown after selection
    open = false;
  };

  const toggle = () => {
    open = !open;
  };

  const close = () => {
    open = false;
  };

  // Close on escape
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };

  let rootEl: HTMLDivElement | null = null;
  const onWindowClick = (e: MouseEvent) => {
    if (!open) return;
    const target = e.target as Node | null;
    if (rootEl && target && !rootEl.contains(target)) {
      close();
    }
  };
</script>

<svelte:window on:keydown={onKeydown} on:click={onWindowClick} />

<!-- Single active button with dropdown; mobile-first -->
<div class="flex justify-center mb-4 sm:mb-6 px-4">
  <div class="relative inline-block" bind:this={rootEl}>
    <!-- Active button always visible; only one button shown -->
    <button
      type="button"
      class="btn btn-sm btn-neutral btn-active active-res"
      aria-haspopup="listbox"
      aria-expanded={open}
      title={labels[selected]}
      on:click={toggle}
    >
      {labels[selected]}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 ml-2 opacity-70">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Dropdown content: only remaining options; positioned absolutely so it floats and doesn't push layout -->
    {#if open}
      <ul
        class="absolute left-1/2 -translate-x-1/2 top-full mt-2 menu menu-sm bg-[#001F3D] text-white rounded-2xl overflow-hidden z-50 w-60 p-2 shadow border border-base-300 text-center"
        role="listbox"
      >
        {#each options as opt}
          <li>
            <button
              type="button"
              class="w-full flex items-center justify-center text-white"
              role="option"
              aria-selected={false}
              on:click={() => setSection(opt)}
            >
              <span>{labels[opt]}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  /* Keep CSS minimal; rely on Tailwind + DaisyUI per project rules */
</style>
