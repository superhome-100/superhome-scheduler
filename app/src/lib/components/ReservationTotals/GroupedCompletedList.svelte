<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ReservationCard from '../ReservationCard/ReservationCard.svelte';
  import ReservationMonthTotal from './ReservationMonthTotal.svelte';
  import { groupCompletedByMonth, pickNumericPrice, formatPeso, getResDate } from '../../utils/reservationTotals';

  const dispatch = createEventDispatcher();

  export let reservations: any[] = [];
  // Max number of items to render globally across months; undefined = no limit
  export let limit: number | undefined = undefined;
  // Optional precomputed monthly totals from the server { 'YYYY-MM': number }
  export let monthlyTotals: Record<string, number> = {};
  

  // Pre-compute groups
  $: groups = groupCompletedByMonth(reservations);

  // Rendering helper to respect the global limit across groups
  const renderState = () => {
    let remaining = typeof limit === 'number' ? Math.max(0, limit) : Number.POSITIVE_INFINITY;
    const rendered: { month: string; label: string; items: any[]; subtotalRendered: number; monthTotal: number }[] = [];

    for (const g of groups) {
      if (remaining <= 0) break;
      const slice = g.items.slice(0, remaining);
      const subtotalRendered = slice.reduce((s, r) => s + pickNumericPrice(r), 0);
      const overrideTotal = monthlyTotals[g.ym];
      rendered.push({ month: g.ym, label: g.label, items: slice, subtotalRendered, monthTotal: overrideTotal ?? g.monthTotal });
      remaining -= slice.length;
    }

    const overall = rendered.reduce((s, gr) => s + gr.subtotalRendered, 0);
    return { rendered, overall };
  };

  $: rs = renderState();

  const handleClick = (reservation: any) => {
    dispatch('reservationClick', reservation);
  };
</script>

<!-- Grouped completed reservations with monthly subtotals and overall total -->
<div class="flex flex-col gap-3">
  {#if rs.rendered.length === 0}
    <div class="text-sm text-slate-500">No completed reservations</div>
  {:else}
    {#each rs.rendered as g}
      <!-- Month label -->
      <div class="flex items-center justify-between mt-2">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide">{g.label}</div>
      </div>
      <!-- Items for month -->
      <div class="flex flex-col gap-2">
        {#each g.items as reservation}
          <ReservationCard reservation={reservation} showPrice={true} on:click={() => handleClick(reservation)} />
        {/each}
      </div>
      <!-- Month total card -->
      <div class="border border-slate-200 rounded-lg bg-white px-3 py-2 flex items-center justify-between">
        <div class="text-xs font-semibold text-slate-600">Total</div>
        <div class="text-sm font-bold text-slate-800 tabular-nums">
          {#if monthlyTotals[g.month] !== undefined || monthlyTotals[g.ym] !== undefined}
            {#if monthlyTotals[g.ym] !== undefined}
              {formatPeso(monthlyTotals[g.ym])}
            {:else}
              {formatPeso(monthlyTotals[g.month])}
            {/if}
          {:else}
            {#if g.items && g.items.length}
              {#key g.ym}
                <ReservationMonthTotal
                  uid={(g.items[0] && (g.items[0].uid || g.items[0].user_id || g.items[0].userId))}
                  dates={[...new Set(g.items.map((r) => getResDate(r)).filter(Boolean))]}
                />
              {/key}
            {:else}
              {formatPeso(0)}
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  /* Keep styles minimal; rely on Tailwind/DaisyUI utility classes in markup */
</style>
