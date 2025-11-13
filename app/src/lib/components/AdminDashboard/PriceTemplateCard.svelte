<script lang="ts">
  import { onMount } from 'svelte';
  import PriceTemplateForm from './PriceTemplateForm.svelte';
  import PriceTemplateList from './PriceTemplateList.svelte';
  import { priceTemplatesApi, type PriceTemplate, type PriceTemplateUpdate } from '../../api/priceTemplatesApi';
  import { showLoading, hideLoading } from '../../stores/ui';

  let templates: PriceTemplate[] = [];
  let editing: PriceTemplateUpdate | null = null;
  let listRef: PriceTemplateList | null = null;
  let listLoading = false;
  let error: string | null = null;

  function onEdit(e: CustomEvent<{ row: PriceTemplateUpdate }>) {
    editing = e.detail.row;
  }

  function onSaved() {
    refreshAll();
  }

  function onCancelEdit() {
    editing = null;
  }

  async function refreshAll() {
    // Load dropdown templates
    error = null;
    listLoading = true;
    showLoading('Refreshing price templates...');
    const [tpls] = await Promise.all([
      priceTemplatesApi.listTemplates(),
      listRef?.load?.()
    ]);
    if (!tpls.success) error = tpls.error ?? 'Failed to load templates';
    templates = tpls.success ? tpls.data : [];
    listLoading = false;
    hideLoading();
  }

  onMount(refreshAll);
</script>

<!-- Card: Price Template (between Pending Reservation Requests and Block Reservation) -->
<div class="card bg-base-100 shadow-lg border border-base-300 mt-6 text-xs">
  <div class="card-body p-4">
    <div class="flex items-center justify-between">
      <h2 class="card-title text-sm">Price Template</h2>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-xs" on:click={refreshAll} disabled={listLoading} aria-busy={listLoading}>
          Refresh
        </button>
      </div>
    </div>

    {#if error}
      <div class="alert alert-error text-xs mb-2"><span>{error}</span></div>
    {/if}

    <!-- Form -->
    <PriceTemplateForm {templates} {editing}
      on:saved={onSaved}
      on:error={(e) => error = e.detail.message}
      on:cancelEdit={onCancelEdit}
    />

    <!-- List -->
    <h3 class="text-xs font-semibold mt-3 mb-1">List of Price Templates</h3>
    <PriceTemplateList bind:this={listRef} on:edit={onEdit} on:deleted={refreshAll} />
  </div>
</div>
