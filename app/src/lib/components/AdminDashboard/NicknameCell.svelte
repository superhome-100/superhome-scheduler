<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let uid: string;
  export let value: string | null | undefined;

  let editing = false;
  let draft = value ?? '';
  let saving = false;
  let inputEl: HTMLInputElement | null = null;

  $: if (!editing) {
    // keep draft in sync when parent updates value
    draft = value ?? '';
  }

  const startEdit = () => {
    editing = true;
    // wait for input render
    setTimeout(() => inputEl?.focus(), 0);
  };

  const cancelEdit = () => {
    editing = false;
    draft = value ?? '';
  };

  const saveIfChanged = async () => {
    const trimmed = draft.trim();
    const current = (value ?? '').trim();
    if (saving) return;
    if (trimmed === current) {
      editing = false;
      return;
    }
    try {
      saving = true;
      // bubble up to parent; parent will perform Edge Function update
      dispatch('save', { uid, nickname: trimmed });
      // Optimistically close. Parent refresh will sync.
      editing = false;
    } finally {
      saving = false;
    }
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveIfChanged();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };
</script>

<div class="w-full max-w-full">
  {#if editing}
    <input
      bind:this={inputEl}
      class="input input-bordered input-xs sm:input-sm w-full"
      placeholder="Nickname"
      bind:value={draft}
      on:blur={saveIfChanged}
      on:keydown={handleKey}
      disabled={saving}
      aria-label="Edit nickname"
    />
  {:else}
    <button
      type="button"
      class="btn btn-ghost btn-xs sm:btn-sm px-1 sm:px-2 normal-case text-[#00294C]"
      title="Click to edit nickname"
      on:click={startEdit}
      aria-label="Edit nickname"
    >
      {#if (value ?? '').trim().length > 0}
        <span class="truncate inline-block max-w-[140px] sm:max-w-[200px] text-xs sm:text-sm">{value}</span>
      {:else}
        <span class="opacity-60 italic text-xs sm:text-sm">-</span>
      {/if}
    </button>
  {/if}
</div>

<style>
  div:focus-within .btn-ghost { outline: none; }
</style>
