<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Enums } from '$lib/database.types';
  import { POOL_TYPES, poolLabelFromKey, OPEN_WATER_SUBTYPES, classroomLabelFromKey } from '$lib/types/availability';

  // Category is either 'all' or one of DB reservation types
  export type Category = 'all' | Enums<'reservation_type'>; // 'pool' | 'open_water' | 'classroom'

  // The available type options are derived dynamically from data
  export let category: Category = 'all';
  export let type: string = 'all';
  export let availableTypes: string[] = []; // depends on category

  const dispatch = createEventDispatcher<{
    change: { category: Category; type: string };
  }>();

  function onCategoryChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as Category;
    // Reset type to 'all' when category changes
    dispatch('change', { category: value, type: 'all' });
  }

  function onTypeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    dispatch('change', { category, type: value });
  }

  // Helper to show user-friendly labels
  function labelForCategory(c: Category) {
    if (c === 'all') return 'All';
    if (c === 'open_water') return 'Open Water';
    if (c === 'pool') return 'Pool';
    if (c === 'classroom') return 'Classroom';
    return String(c);
  }

  // Helper to show user-friendly labels for type keys based on category
  function labelForTypeKey(key: string): string {
    if (category === 'pool') {
      // keys: 'autonomous' | 'course_coaching'
      try { return poolLabelFromKey(key as any); } catch { return key; }
    }
    if (category === 'classroom') {
      // only 'course_coaching'
      return classroomLabelFromKey('course_coaching' as any);
    }
    if (category === 'open_water') {
      // keys: OPEN_WATER_SUBTYPES keys
      return (OPEN_WATER_SUBTYPES as any)[key] ?? key;
    }
    return key;
  }
</script>

<div class="w-full flex flex-row items-center justify-center gap-2">
  <div class="form-control flex-1 min-w-0">
    <label class="sr-only" for="category-select">
      <span class="label-text text-sm">Category</span>
    </label>
    <select id="category-select" aria-label="Category" class="select select-bordered select-sm h-9 w-full" on:change={onCategoryChange} bind:value={category}>
      <option value="all">All</option>
      <option value="open_water">Open Water</option>
      <option value="pool">Pool</option>
      <option value="classroom">Classroom</option>
    </select>
  </div>

  <div class="form-control flex-1 min-w-0">
    <label class="sr-only" for="type-select">
      <span class="label-text text-sm">Type</span>
    </label>
    <select id="type-select" aria-label="Type" class="select select-bordered select-sm h-9 w-full" on:change={onTypeChange} bind:value={type} disabled={category === 'all'}>
      <option value="all">All</option>
      {#if category !== 'all'}
        {#each availableTypes as t}
          <option value={t}>{labelForTypeKey(t)}</option>
        {/each}
      {/if}
    </select>
  </div>
</div>
