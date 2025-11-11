<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '../../utils/supabase';
  import { reservationLastUpdated } from '$lib/stores/reservationSync';

  export let uid: string;
  export let dates: string[] = [];

  let loading = true;
  let errorMsg = '';
  let total = 0;

  const formatPHP = (n: number) => `P${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  async function computeTotals() {
    loading = true;
    errorMsg = '';
    total = 0;
    try {
      // De-duplicate dates to avoid double-count when same date appears multiple times in the group
      const uniqueDates = Array.from(new Set((dates || []).filter(Boolean)));
      let sum = 0;
      for (const d of uniqueDates) {
        const { data, error } = await supabase.rpc('compute_reservation_total', { p_res_date: d });
        if (error) throw error;
        const n = Number(data) || 0;
        sum += n;
      }
      total = sum;
    } catch (e: any) {
      errorMsg = e?.message || 'Failed to compute total';
      total = 0;
    } finally {
      loading = false;
    }
  }

  let unsub: (() => void) | null = null;
  onMount(() => {
    computeTotals();
    unsub = reservationLastUpdated.subscribe(() => {
      // Admin-side manual price updates will bump this store; recompute totals
      computeTotals();
    });
  });
  onDestroy(() => {
    unsub && unsub();
  });
  $: if (uid && dates) {
    // if props change, recompute
  }
</script>

{#if loading}
  <span class="opacity-60">…</span>
{:else if errorMsg}
  <span class="text-error">—</span>
{:else}
  <span class="tabular-nums">{formatPHP(total)}</span>
{/if}

<style>
  .text-error { color: #dc2626; }
</style>
