<script lang="ts">
  import dayjs from 'dayjs';
  import { createEventDispatcher } from 'svelte';
  import { priceTemplatesApi, type PriceTemplateUpdate } from '../../api/priceTemplatesApi';
  import { showLoading, hideLoading } from '../../stores/ui';

  const dispatch = createEventDispatcher();

  let updates: PriceTemplateUpdate[] = [];
  let loading = false;
  let error: string | null = null;

  export async function load() {
    error = null;
    loading = true;
    showLoading('Loading price templates...');
    const res = await priceTemplatesApi.listUpdates();
    loading = false;
    hideLoading();
    if (!res.success) {
      error = res.error ?? 'Failed to load price template updates';
      updates = [];
      return;
    }
    updates = res.data;
  }

  async function remove(id: string) {
    loading = true;
    showLoading('Deleting price template...');
    const res = await priceTemplatesApi.remove(id);
    loading = false;
    hideLoading();
    if (!res.success) {
      error = res.error ?? 'Failed to delete price template update';
      return;
    }
    await load();
    dispatch('deleted');
  }

  function edit(row: PriceTemplateUpdate) {
    dispatch('edit', { row });
  }
</script>

{#if error}
  <div class="alert alert-error text-xs mb-2"><span>{error}</span></div>
{/if}

<div class="card bg-base-100 border border-base-300 w-full">
  <div class="card-body p-0">
    <div class="overflow-x-auto w-full">
      <table class="table table-zebra table-xs w-full">
        <thead>
          <tr>
            <th>Created</th>
            <th>Template</th>
            <th>Coach OW</th>
            <th>Coach Pool</th>
            <th>Coach Classroom</th>
            <th>Auto OW</th>
            <th>Auto Pool</th>
            <th>Platform OW</th>
            <th>Platform CBS OW</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#if updates.length === 0}
            <tr>
              <td colspan="10" class="text-center">
                <div class="pt-6 pb-4 text-base-content/60 font-medium">No price templates</div>
              </td>
            </tr>
          {:else}
            {#each updates as u}
              <tr>
                <td>{dayjs(u.created_at).format('YYYY-MM-DD HH:mm')}</td>
                <td class="font-medium">{u.price_template_name}</td>
                <td>{u.coach_ow}</td>
                <td>{u.coach_pool}</td>
                <td>{u.coach_classroom}</td>
                <td>{u.auto_ow}</td>
                <td>{u.auto_pool}</td>
                <td>{u.platform_ow}</td>
                <td>{u.platformcbs_ow}</td>
                <td class="whitespace-nowrap">
                  <div class="flex gap-2 justify-end">
                    <button class="btn btn-ghost btn-xs" on:click={() => edit(u)}>Edit</button>
                    <button class="btn btn-outline btn-error btn-xs" on:click={() => remove(u.id)} disabled={loading}>Delete</button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
