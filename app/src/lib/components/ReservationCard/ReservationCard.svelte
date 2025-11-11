<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import dayjs, { formatCompactTime, getOpenWaterDepth } from '../../utils/dateUtils';
  import { transformReservationToUnified } from '../../utils/reservationTransform';
  import ReservationPriceBreakdown from './ReservationPriceBreakdown.svelte';

  export let reservation: any;
  export let clickable: boolean = true;
  export let compact: boolean = true;
  export let showPrice: boolean = true;
  // When true, on small screens move the price cell to a second row (mobile-first requirement for Admin User Reservations)
  export let priceBelowOnMobile: boolean = false;

  // Computed classes
  $: gridColsClass = priceBelowOnMobile ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-5';

  // Auto-fit font size action for price text: shrink only when overflowing
  function autoFit(node: HTMLElement, params: { min?: number; max?: number; step?: number } = {}) {
    const { min = 10, max = 16, step = 0.5 } = params;
    let current = Math.min(parseFloat(getComputedStyle(node).fontSize || '14'), max);

    const fit = () => {
      // Reset to max to retry fitting after container grows
      current = Math.min(current, max);
      node.style.fontSize = current + 'px';
      let guard = 0;
      // If the content overflows, reduce gradually
      while (node.scrollWidth > node.clientWidth && current > min && guard < 100) {
        current -= step;
        node.style.fontSize = current + 'px';
        guard++;
      }
    };

    const ro = new ResizeObserver(() => fit());
    ro.observe(node);
    const mo = new MutationObserver(() => fit());
    mo.observe(node, { childList: true, characterData: true, subtree: true });
    // Initial fit after mount
    queueMicrotask(fit);

    return {
      destroy() {
        ro.disconnect();
        mo.disconnect();
      }
    };
  }

  const dispatch = createEventDispatcher();

  // Normalize to a unified shape for consistent rendering across raw rows and modal items
  $: unified = (() => {
    try {
      // Heuristic: if it already has unified fields, skip transform
      if (reservation && (reservation.startTime || reservation.endTime || reservation.type)) {
        return reservation;
      }
      return transformReservationToUnified(reservation);
    } catch (e) {
      return reservation;
    }
  })();

  // Derive start/end labels for Pool/Classroom mobile two-line display
  $: resType = unified?.res_type || unified?.type;
  $: isOpenWater = resType === 'open_water' || resType === 'Open Water';
  const fmt = (t: any) => {
    if (!t) return '';
    const d = dayjs(`2000-01-01T${t}`);
    return d.isValid() ? d.format('h:mm A') : String(t);
  };
  $: startRaw = unified?.start_time
    || unified?.startTime
    || unified?.start
    || unified?.start_at
    || unified?.res_classroom?.start_time
    || unified?.res_pool?.start_time
    || unified?.classroom?.start_time
    || unified?.pool?.start_time
    || unified?.res_details?.start_time
    || unified?.resDetails?.startTime;
  $: endRaw = unified?.end_time
    || unified?.endTime
    || unified?.end
    || unified?.end_at
    || unified?.res_classroom?.end_time
    || unified?.res_pool?.end_time
    || unified?.classroom?.end_time
    || unified?.pool?.end_time
    || unified?.res_details?.end_time
    || unified?.resDetails?.endTime;
  $: startLabel = fmt(startRaw);
  $: endLabel = fmt(endRaw);

  // Date columns: Day and Month (force UTC to avoid timezone shifts)
  $: dayNum = (() => {
    const d = dayjs.utc(unified?.res_date || unified?.date);
    return d.isValid() ? d.format('D') : '';
  })();
  $: monthShort = (() => {
    const d = dayjs.utc(unified?.res_date || unified?.date);
    return d.isValid() ? d.format('MMM') : '';
  })();

  // Combined compact date label (e.g., "4 Nov") for a single date cell
  $: dateLabel = [dayNum, monthShort].filter(Boolean).join(' ');

  // Price display (no hardcoded placeholder; hide when not available)
  const pickPrice = (r: any): number | string | undefined => {
    if (!r) return undefined;
    const candidates = [r.price, r.total_price, r.totalPrice, r.amount, r.fee, r.cost];
    return candidates.find((v) => v !== undefined && v !== null);
  };
  // Prefer price from unified; if not present (because transform may omit it), fall back to original reservation
  $: rawPrice = (() => {
    const u = pickPrice(unified);
    if (u !== undefined && u !== null && u !== '') return u;
    return pickPrice(reservation);
  })();
  $: priceLabel = (() => {
    if (rawPrice === undefined || rawPrice === null || rawPrice === '') return '';
    const n = Number(rawPrice);
    if (!isNaN(n) && isFinite(n)) return `P${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return String(rawPrice);
  })();

  // Values for price RPC when not persisted: use uid and res_date from unified/reservation
  $: priceUid = unified?.uid || reservation?.uid;
  $: priceResDate = (() => {
    const raw = unified?.res_date || unified?.date;
    if (!raw) return undefined as unknown as string;
    // Prefer an exact ISO timestamp so breakdown can match the specific reservation row
    const d = dayjs.utc(raw);
    return d.isValid() ? d.toISOString() : String(raw);
  })();
  // Derive category/typeKey for precise price breakdown filtering
  $: priceCategory = (() => {
    const t = (unified?.res_type || unified?.type || '').toString().toLowerCase();
    if (t === 'open water') return 'open_water';
    if (t === 'open_water' || t === 'pool' || t === 'classroom') return t;
    return undefined;
  })();
  $: priceTypeKey = (() => {
    // Try unified nested shapes first, then raw reservation
    const ow = unified?.res_openwater || unified?.open_water || reservation?.res_openwater || reservation?.open_water;
    const pool = unified?.res_pool || unified?.pool || reservation?.res_pool || reservation?.pool;
    const classroom = unified?.res_classroom || unified?.classroom || reservation?.res_classroom || reservation?.classroom;
    if (priceCategory === 'open_water') return ow?.open_water_type || ow?.type || unified?.open_water_type || reservation?.open_water_type;
    if (priceCategory === 'pool') return pool?.pool_type || pool?.type || unified?.pool_type || reservation?.pool_type;
    if (priceCategory === 'classroom') return classroom?.classroom_type || classroom?.type || unified?.classroom_type || reservation?.classroom_type;
    return undefined;
  })();

  const handleClick = () => {
    if (clickable) dispatch('click', reservation);
  };
</script>

<div
  class="reservation-item {compact ? 'compact' : ''}"
  class:clickable={clickable}
  on:click={handleClick}
  role={clickable ? 'button' : undefined}
  {...(clickable ? { tabindex: 0 } : {})}
  on:keydown={(e) => clickable && e.key === 'Enter' && handleClick()}
  aria-label={clickable ? 'View reservation details' : undefined}
>
  <div
    class="compact-content grid items-start gap-2 sm:gap-3 md:gap-4 w-full min-w-0 overflow-hidden"
  >
    <!-- First row grid: on mobile optionally reduce to 4 cols (date, type, time, status) and push price below -->
    <div class={`grid ${gridColsClass} gap-2 sm:gap-3 md:gap-4 w-full text-[11px] sm:text-[12px] md:text-[14px] overflow-hidden`}
      use:autoFit={{ min: 9, max: 14, step: 0.25 }}
    >
      <!-- Date cell (e.g., 4 Nov) -->
      <div class="flex items-center justify-start text-slate-900 font-semibold min-w-0 overflow-hidden">
        <span class="whitespace-nowrap">{dateLabel}</span>
      </div>

      <!-- Type cell -->
      <div class="flex items-center justify-start text-slate-700 font-semibold min-w-0 overflow-hidden">
        <span class="type-badge {compact ? 'compact' : ''} whitespace-nowrap"
          class:pool={unified.res_type === 'pool' || unified.type === 'Pool'}
          class:openwater={unified.res_type === 'open_water' || unified.type === 'Open Water'}
          class:classroom={unified.res_type === 'classroom' || unified.type === 'Classroom'}
        >
          {unified.res_type === 'open_water' ? 'Open Water' : unified.res_type === 'pool' ? 'Pool' : unified.res_type === 'classroom' ? 'Classroom' : (unified.type || '')}
        </span>
      </div>

      <!-- Time/Depth cell -->
      <div class="flex items-center justify-start text-slate-600 min-w-0 overflow-hidden">
        {#if isOpenWater}
          {#if (getOpenWaterDepth(unified) || getOpenWaterDepth(reservation))}
            <span class="whitespace-nowrap">{formatCompactTime(unified)} {getOpenWaterDepth(unified) || getOpenWaterDepth(reservation)}</span>
          {:else}
            <span class="whitespace-nowrap">{formatCompactTime(unified)}</span>
          {/if}
        {:else}
          {#if startLabel}
            <span class="leading-tight flex flex-col">
              <span class="whitespace-nowrap">{startLabel}</span>
              {#if endLabel}
                <span class="whitespace-nowrap">{endLabel}</span>
              {/if}
            </span>
          {:else}
            <span class="whitespace-nowrap">{formatCompactTime(unified)}</span>
          {/if}
        {/if}
      </div>

      <!-- Status cell -->
      <div class="flex items-center justify-start min-w-0 overflow-hidden">
        <span class="status-badge {compact ? 'compact' : ''} whitespace-nowrap"
          class:confirmed={unified.res_status === 'confirmed'}
          class:pending={unified.res_status === 'pending'}
          class:rejected={unified.res_status === 'rejected'}
          class:approved={unified.status === 'approved'}
          class:completed={unified.status === 'completed' || unified.res_status === 'completed'}
          class:ongoing={unified.status === 'ongoing'}
        >
          {(unified.res_status || unified.status || 'pending').toString().charAt(0).toUpperCase() + (unified.res_status || unified.status || 'pending').toString().slice(1).toLowerCase()}
        </span>
      </div>

      <!-- Price cell -->
      {#if showPrice}
        <!-- Price in-grid: hide on mobile when priceBelowOnMobile -->
        <div
          class="justify-self-end {priceBelowOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap shrink-0"
          use:autoFit={{ min: 9, max: 16, step: 0.5 }}
        >
          <slot name="price">
            {#if rawPrice !== undefined && rawPrice !== null && rawPrice !== ''}
              {priceLabel}
            {:else if priceUid && priceResDate}
              <ReservationPriceBreakdown
                uid={priceUid}
                resDate={priceResDate}
                category={priceCategory}
                typeKey={priceTypeKey}
              />
            {:else}
              {priceLabel}
            {/if}
          </slot>
        </div>
      {/if}
    </div>
    {#if showPrice && priceBelowOnMobile}
      <!-- Mobile-only second row for price/edit, aligned bottom-right -->
      <div class="flex sm:hidden justify-end items-end mt-1 text-right">
        <div class="flex items-center gap-2 font-semibold text-slate-700 tabular-nums whitespace-nowrap">
          <slot name="price">
            {#if rawPrice !== undefined && rawPrice !== null && rawPrice !== ''}
              {priceLabel}
            {:else if priceUid && priceResDate}
              <ReservationPriceBreakdown
                uid={priceUid}
                resDate={priceResDate}
                category={priceCategory}
                typeKey={priceTypeKey}
              />
            {:else}
              {priceLabel}
            {/if}
          </slot>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .reservation-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; transition: all 0.2s ease; }
  .reservation-item.compact { padding: 0.75rem; }

  .reservation-item.clickable { cursor: pointer; }
  .reservation-item.clickable:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
  }
  .reservation-item.clickable:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }

  /* Type: plain colored text, no badge visuals */
  .type-badge { padding: 0; border-radius: 0; font-size: 1em; font-weight: 600; text-transform: none; letter-spacing: 0; background: transparent; border: 0; outline: 0; box-shadow: none; }
  .type-badge.compact { padding: 0; font-size: inherit; }
  .type-badge.pool { color: #1d4ed8; }
  .type-badge.openwater { color: #059669; }
  .type-badge.classroom { color: #dc2626; }

  /* Status: plain colored text, no badge visuals */
  .status-badge { padding: 0; border-radius: 0; font-size: 1em; font-weight: 600; text-transform: none; letter-spacing: 0; background: transparent; border: 0; outline: 0; box-shadow: none; }
  .status-badge.compact { padding: 0; font-size: inherit; }
  .status-badge.confirmed, .status-badge.approved { color: #059669; }
  .status-badge.pending { color: #d97706; }
  .status-badge.rejected { color: #dc2626; }
  .status-badge.completed { color: #1d4ed8; }
  .status-badge.ongoing { color: #7c3aed; }

  /* Keep font sizing responsive but minimal; rely on Tailwind utilities in markup */
  @media (min-width: 769px) { .type-badge, .status-badge { font-size: inherit; } }
</style>
