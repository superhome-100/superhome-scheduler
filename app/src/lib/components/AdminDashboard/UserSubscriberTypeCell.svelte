<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ConfirmModal from '../ConfirmModal.svelte';

  export let uid: string;
  export let value: string | null = null; // current price_template_name
  export let templates: Array<{ name: string; description: string | null; created_at: string }> = [];

  const dispatch = createEventDispatcher();
  let editing = false;
  let selected = value || '';
  let pending = value || '';
  let modalOpen = false;
  let changed = false;

  const startEdit = () => {
    editing = true;
    selected = value || '';
    pending = selected;
    changed = false;
  };

  const cancelEdit = () => {
    // revert any local changes
    selected = value || '';
    pending = selected;
    changed = false;
    editing = false;
  };

  const openConfirmIfChanged = () => {
    if (changed && pending && pending !== value) {
      modalOpen = true;
    } else {
      editing = false;
    }
  };

  const onSelectChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    pending = target.value;
    changed = pending !== value;
    // Open confirmation immediately upon change
    if (changed) {
      modalOpen = true;
    }
  };

  const confirmSave = () => {
    const name = pending?.trim();
    if (!name || name === value) {
      modalOpen = false;
      editing = false;
      return;
    }
    selected = name;
    modalOpen = false;
    editing = false;
    dispatch('save', { uid, price_template_name: name });
  };

  const cancelSave = () => {
    // Restore selection, close modal and exit edit mode
    modalOpen = false;
    selected = value || '';
    pending = selected;
    changed = false;
    editing = false;
  };
</script>

{#if !editing}
  <button class="btn btn-ghost btn-xs sm:btn-sm" title="Edit subscriber type" on:click={startEdit}>
    {value || 'Regular'}
  </button>
{:else}
  <div class="flex items-center">
    <select
      class="select select-bordered select-xs sm:select-sm"
      bind:value={selected}
      on:change={onSelectChange}
    >
      {#each templates as t}
        <option value={t.name}>{t.name}</option>
      {/each}
    </select>
  </div>
{/if}

<ConfirmModal
  bind:open={modalOpen}
  title="Confirm Subscriber Type"
  message={`Change subscriber type to "${pending || 'Regular'}"?`}
  confirmText="Save"
  cancelText="Cancel"
  closeOnBackdrop={false}
  closeOnEscape={false}
  on:confirm={confirmSave}
  on:cancel={cancelSave}
/>
