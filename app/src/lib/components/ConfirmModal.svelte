<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title: string = 'Confirm Action';
  export let message: string = 'Are you sure?';
  export let confirmText: string = 'Confirm';
  export let cancelText: string = 'Cancel';
  // Control closing behaviors; default to previous behavior for backward compatibility
  export let closeOnBackdrop: boolean = true;
  export let closeOnEscape: boolean = true;

  const dispatch = createEventDispatcher();

  const close = () => {
    open = false;
    dispatch('cancel');
  };

  const confirm = () => {
    open = false;
    dispatch('confirm');
  };
</script>

<svelte:window on:keydown={(e) => open && closeOnEscape && e.key === 'Escape' && close()} />

{#if open}
  <div
    class="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="0"
    on:click|self={() => { if (closeOnBackdrop) close(); }}
    on:keydown={(e) => { /* prevent backdrop keyboard close unless explicitly handled */ }}
  >
    <div class="w-full max-w-sm rounded-xl bg-white shadow-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-200">
        <h2 class="text-[1.05rem] font-semibold text-slate-800 m-0">{title}</h2>
      </div>
      <div class="px-5 py-4">
        <p class="text-sm text-slate-700 whitespace-pre-line">{message}</p>
      </div>
      <div class="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
        <button class="btn btn-sm" on:click={close} aria-label={cancelText}>{cancelText}</button>
        <button class="btn btn-sm btn-error" on:click={confirm} aria-label={confirmText}>{confirmText}</button>
      </div>
    </div>
  </div>
{/if}
