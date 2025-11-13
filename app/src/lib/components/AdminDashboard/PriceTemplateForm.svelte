<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { priceTemplatesApi, type PriceTemplate, type PriceTemplateUpdate } from '../../api/priceTemplatesApi';
  import { showLoading, hideLoading } from '../../stores/ui';
  import '../../styles/inputs.css';

  const dispatch = createEventDispatcher();

  export let templates: PriceTemplate[] = [];
  export let editing: PriceTemplateUpdate | null = null;

  let form = {
    id: '' as string | undefined,
    price_template_name: '',
    coach_ow: 0,
    coach_pool: 0,
    coach_classroom: 0,
    auto_ow: 0,
    auto_pool: 0,
    platform_ow: 0,
    platformcbs_ow: 0
  };

  $: if (editing) {
    form = {
      id: editing.id,
      price_template_name: editing.price_template_name,
      coach_ow: editing.coach_ow,
      coach_pool: editing.coach_pool,
      coach_classroom: editing.coach_classroom,
      auto_ow: editing.auto_ow,
      auto_pool: editing.auto_pool,
      platform_ow: editing.platform_ow,
      platformcbs_ow: editing.platformcbs_ow
    };
  }

  function reset() {
    form = {
      id: undefined,
      price_template_name: templates[0]?.name || '',
      coach_ow: 0,
      coach_pool: 0,
      coach_classroom: 0,
      auto_ow: 0,
      auto_pool: 0,
      platform_ow: 0,
      platformcbs_ow: 0
    };
    dispatch('cancelEdit');
  }

  async function save() {
    showLoading(editing ? 'Updating price template' : 'Creating price template');
    try {
      const payload = { ...form } as any;
      const res = editing ? await priceTemplatesApi.update(payload) : await priceTemplatesApi.create(payload);
      if (!res.success) {
        dispatch('error', { message: res.error || 'Failed to save template' });
        return;
      }
      dispatch('saved', { data: res.data });
      reset();
    } finally {
      hideLoading();
    }
  }
</script>

<!-- Form: mirrors price_template_updates cols except created_at auto -->
<div class="overflow-x-auto">
  <table class="table table-xs w-full">
    <thead>
      <tr>
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
      <tr>
        <td class="align-top">
          <div class="form-control">
            <label class="label py-1" for="pt-name"><span class="label-text text-xs">Template</span></label>
            <input id="pt-name" class="input input-bordered input-xs w-full" type="text" placeholder="Enter template name" bind:value={form.price_template_name} />
          </div>
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.coach_ow} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.coach_pool} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.coach_classroom} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.auto_ow} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.auto_pool} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.platform_ow} />
        </td>
        <td class="align-top">
          <input class="input input-bordered input-xs w-full no-spinner" type="number" bind:value={form.platformcbs_ow} />
        </td>
        <td class="align-top whitespace-nowrap">
          <div class="flex gap-2 mt-6">
            <button class="btn btn-primary btn-xs" on:click={save}>{editing ? 'Update' : 'Create'}</button>
            {#if editing}
              <button class="btn btn-ghost btn-xs" on:click={reset}>Cancel</button>
            {/if}
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
