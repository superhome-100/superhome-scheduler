<script lang="ts">
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import { availabilityApi } from '../../api/availabilityApi';
  import { AvailabilityCategory, CategoryTypeOptions } from '../../types/availability';
  import { showLoading, hideLoading } from '../../stores/ui';

  type BlockRow = {
    id: number;
    date: string;
    category: AvailabilityCategory;
    type: string | null;
    available: boolean;
    reason: string | null;
  };

  // UI state
  let loading = false;
  let listLoading = false;
  let error: string | null = null;
  let success: string | null = null;
  $: edgeFnOffline = !!error && /503|Service Temporarily Unavailable|Failed to fetch|edge function/i.test(error);

  // Filters / form
  let selCategory: AvailabilityCategory = AvailabilityCategory.openwater;
  let selType: string | null = 'Autonomous on Buoy';
  let selDate: string = dayjs().format('YYYY-MM-DD');
  let reason: string = '';

  let blocks: BlockRow[] = [];

  function resetMessages() {
    error = null;
    success = null;
  }

  async function loadBlocks() {
    resetMessages();
    listLoading = true;
    showLoading('Loading blocks...');
    const res = await availabilityApi.list();
    if (!res.success) {
      error = res.error ?? 'Failed to load blocks';
      listLoading = false;
      hideLoading();
      return;
    }
    // Only display blocks (available=false). Keep sorted by date desc
    blocks = (res.data || [])
      .filter(b => !b.available)
      .sort((a, b) => b.date.localeCompare(a.date)) as BlockRow[];
    listLoading = false;
    hideLoading();
  }

  function onCategoryChange(cat: AvailabilityCategory) {
    selCategory = cat;
    const opts = CategoryTypeOptions[selCategory];
    if (selCategory === AvailabilityCategory.openwater) {
      selType = 'Autonomous on Buoy';
    } else {
      selType = opts.length ? opts[0] : null;
    }
  }

  function categoryLabel(cat: AvailabilityCategory | string): string {
    if (cat === AvailabilityCategory.openwater || cat === 'openwater' || cat === 'open_water') return 'Open Water';
    if (cat === AvailabilityCategory.pool || cat === 'pool') return 'Pool';
    if (cat === AvailabilityCategory.classroom || cat === 'classroom') return 'Classroom';
    return String(cat);
  }

  async function addBlock() {
    resetMessages();
    loading = true;
    showLoading('Adding block...');
    const res = await availabilityApi.create({
      date: selDate,
      category: selCategory,
      type: selType,
      available: false,
      reason: reason ? reason : null,
    });
    loading = false;
    hideLoading();
    if (!res.success) {
      error = res.error ?? 'Failed to add block';
      return;
    }
    success = 'Block added';
    await loadBlocks();
  }

  async function deleteBlock(id: number) {
    resetMessages();
    loading = true;
    showLoading('Deleting block...');
    const res = await availabilityApi.remove(id);
    loading = false;
    hideLoading();
    if (!res.success) {
      error = res.error ?? 'Failed to delete block';
      return;
    }
    success = 'Block removed';
    await loadBlocks();
  }

  onMount(loadBlocks);
</script>

<!-- Card: Block Reservation -->
<div class="card bg-base-100 shadow-lg border border-base-300 mt-6 text-xs">
  <div class="card-body p-4">
    <div class="flex items-center justify-between">
      <h2 class="card-title text-sm">Block Reservation</h2>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-xs" on:click={loadBlocks} disabled={listLoading} aria-busy={listLoading}>
          Refresh
        </button>
      </div>
    </div>

    {#if error}
      <div class="alert alert-error text-xs">
        <span>{error}</span>
      </div>
    {/if}
    {#if edgeFnOffline}
      <div class="alert alert-warning text-xs">
        <div>
          <span class="font-semibold">Edge functions appear offline.</span>
          <span class="ml-1">Reads still work, but CREATE/DELETE require the local Supabase functions server.</span>
        </div>
        <div class="mt-1 opacity-80">
          Start functions locally and retry: <code>supabase start</code> or <code>supabase functions serve</code>.
        </div>
      </div>
    {/if}
    {#if success}
      <div class="alert alert-success text-xs">
        <span>{success}</span>
      </div>
    {/if}

    <!-- Filter and Selection Panel as full-width 1x4 table card -->
    <div class="overflow-x-auto mt-2">
      <table class="table table-xs w-full">
        <thead>
          <tr>
            <th>Category</th>
            <th>Type</th>
            <th>Date</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="align-top">
              <div class="form-control">
                <label class="label py-1" for="block-category"><span class="label-text text-xs">Category</span></label>
                <select id="block-category" class="select select-bordered select-xs w-full" bind:value={selCategory} on:change={(e) => onCategoryChange((e.target as HTMLSelectElement).value as AvailabilityCategory)}>
                  <option value={AvailabilityCategory.pool}>Pool</option>
                  <option value={AvailabilityCategory.openwater}>Open Water</option>
                  <option value={AvailabilityCategory.classroom}>Classroom</option>
                </select>
              </div>
            </td>
            <td class="align-top">
              <div class="form-control">
                <label class="label py-1" for="block-type"><span class="label-text text-xs">Type</span></label>
                <select id="block-type" class="select select-bordered select-xs w-full" bind:value={selType}>
                  {#each CategoryTypeOptions[selCategory] as t}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </div>
            </td>
            <td class="align-top">
              <div class="form-control">
                <label class="label py-1" for="block-date"><span class="label-text text-xs">Date</span></label>
                <input id="block-date" type="date" class="input input-bordered input-xs w-full" bind:value={selDate} min={dayjs().format('YYYY-MM-DD')} />
              </div>
            </td>
            <td class="align-top">
              <div class="form-control">
                <label class="label py-1" for="block-reason"><span class="label-text text-xs">Reason (optional)</span></label>
                <input id="block-reason" type="text" class="input input-bordered input-xs w-full" bind:value={reason} placeholder="Maintenance, event..." />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-2">
      <button class="btn btn-primary btn-xs" on:click={addBlock} disabled={loading} aria-busy={loading}>
        Add Block
      </button>
    </div>

    <!-- Blocks Overview Table -->
    <h3 class="text-xs font-semibold mt-3 mb-1">List of Blocked Reservation</h3>
    <div class="card bg-base-100 border border-base-300 w-full">
      <div class="card-body p-0">
        <div class="overflow-x-auto w-full">
          <table class="table table-zebra table-xs w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Type</th>
                <th>Status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {#if blocks.length === 0}
                <tr>
                  <td colspan="5" class="text-center">
                    <div class="pt-6 pb-4 text-base-content/60 font-medium">No blocks</div>
                  </td>
                </tr>
              {:else}
                {#each blocks as b}
                  <tr>
                    <td>{dayjs(b.date).format('YYYY-MM-DD')}</td>
                    <td class="capitalize">{categoryLabel(b.category)}</td>
                    <td>{b.type ?? '-'}</td>
                    <td>
                      {#if !b.available}
                        <div class="badge badge-error badge-xs">Blocked</div>
                      {:else}
                        <div class="badge badge-success badge-xs">Available</div>
                      {/if}
                    </td>
                    <td class="text-center">
                      <button class="btn btn-outline btn-error btn-xs" on:click={() => deleteBlock(b.id)}>Delete</button>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
