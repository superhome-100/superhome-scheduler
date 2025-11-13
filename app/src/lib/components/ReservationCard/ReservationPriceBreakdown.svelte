<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '../../utils/supabase';
  import { reservationLastUpdated } from '$lib/stores/reservationSync';
  import type { Database } from '$lib/database.types';

  export let uid: string;
  export let resDate: string; // 'YYYY-MM-DD'
  // Optional filters to avoid summing prices across categories for the same date
  // Pass the reservation's category (e.g., 'pool' | 'open_water' | 'classroom')
  // and/or the specific type_key (e.g., 'course_coaching', 'autonomous', ...)
  export let category: Database['public']['Enums']['reservation_type'] | undefined;
  export let typeKey:
    | Database['public']['Enums']['pool_activity_type']
    | Database['public']['Enums']['classroom_activity_type']
    | Database['public']['Enums']['openwater_activity_type']
    | undefined;

  type PriceRow = {
    category: Database['public']['Enums']['reservation_type'];
    type_key:
      | Database['public']['Enums']['pool_activity_type']
      | Database['public']['Enums']['classroom_activity_type']
      | Database['public']['Enums']['openwater_activity_type'];
    price: number;
    price_field:
      | 'coach_pool'
      | 'auto_pool'
      | 'coach_classroom'
      | 'coach_ow'
      | 'auto_ow'
      | 'platform_ow'
      | 'platformcbs_ow';
  };

  let rows: PriceRow[] = [];
  let manualPrice: number | null = null;
  let loading = true;
  let errorMsg = '';
  // If category/typeKey provided, only sum matching rows; otherwise sum all (backward compatible)
  $: filteredRows = rows.filter((r) =>
    (category ? r.category === category : true) &&
    (typeKey ? r.type_key === typeKey : true)
  );
  $: total = filteredRows.reduce((sum, r) => sum + (r?.price ?? 0), 0);

  const formatPHP = (n: number) => `P${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function fetchPrices() {
    loading = true;
    errorMsg = '';
    rows = [];
    manualPrice = null;
    try {
      // 1) Check for manual override on parent reservation
      const hasTime = /T/.test(resDate);
      let parent: { price?: number | null } | null = null;
      let pe: any = null;
      if (hasTime) {
        const { data, error } = await supabase
          .from('reservations')
          .select('price')
          .eq('uid', uid)
          .eq('res_date', resDate)
          .maybeSingle();
        parent = data as any;
        pe = error;
      } else {
        // Match any reservation on that UTC calendar day
        const day = new Date(resDate);
        const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0)).toISOString();
        const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1, 0, 0, 0, 0)).toISOString();
        const { data, error } = await supabase
          .from('reservations')
          .select('price, res_date')
          .eq('uid', uid)
          .gte('res_date', start)
          .lt('res_date', end)
          .order('res_date', { ascending: true })
          .limit(1);
        parent = Array.isArray(data) ? (data[0] as any) : null;
        pe = error;
      }
      if (!pe && parent && parent.price !== null && parent.price !== undefined) {
        manualPrice = Number(parent.price);
      }
      // 2) Fetch computed breakdown as fallback/context
      const { data, error } = await supabase.rpc('compute_prices_for_reservation', {
        p_uid: uid,
        p_res_date: resDate
      });
      if (error) {
        errorMsg = error.message ?? 'Failed to load price';
      } else {
        rows = Array.isArray(data) ? (data as PriceRow[]) : [];
      }
    } catch (e: any) {
      errorMsg = e?.message || 'Failed to load price';
    }
    loading = false;
  }

  onMount(fetchPrices);
  let unsub: (() => void) | null = null;
  onMount(() => {
    unsub = reservationLastUpdated.subscribe(() => {
      // Admin updated price; refetch
      fetchPrices();
    });
  });
  onDestroy(() => unsub && unsub());
  $: if (uid && resDate) {
    // reactive refetch if props change
  }
</script>

{#if loading}
  <span class="opacity-60">…</span>
{:else if errorMsg}
  <span class="text-error">—</span>
{:else}
  {#if manualPrice !== null}
    <span class="tabular-nums">{formatPHP(manualPrice)}</span>
  {:else if filteredRows.length === 0}
    <span class="opacity-70">P0.00</span>
  {:else}
    <span class="tabular-nums">{formatPHP(total)}</span>
  {/if}
{/if}

<style>
  .text-error { color: #dc2626; }
</style>
