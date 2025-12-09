<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import dayjs, { formatCompactTime, getOpenWaterDepth } from '../../utils/dateUtils';
  import autoFit from '../../utils/autoFit';
  import { transformReservationToUnified } from '../../utils/reservationTransform';
  import ReservationPriceBreakdown from './ReservationPriceBreakdown.svelte';
  import './ReservationCard.css';

  export let reservation: any;
  export let clickable: boolean = true;
  export let compact: boolean = true;
  export let showPrice: boolean = true;
  // When true, on small screens move the price cell to a second row (mobile-first requirement for Admin User Reservations)
  export let priceBelowOnMobile: boolean = false;
  // Allow parent to explicitly control visibility of the Cancel button (e.g., hide on Completed lists)
  export let showCancel: boolean = true;

  // Computed classes
  // Grid columns base: Date | Type | StudentCount | Time | Status
  // + Cancel (if showCancel)
  // + Price (always on sm+; on mobile only when priceBelowOnMobile is false)
  $: mobileCols = 5 + (showCancel ? 1 : 0) + ((showPrice && !priceBelowOnMobile) ? 1 : 0);
  $: desktopCols = 5 + (showCancel ? 1 : 0) + (showPrice ? 1 : 0);
  $: gridColsClass = `${mobileCols === 5 ? 'grid-cols-5' : mobileCols === 6 ? 'grid-cols-6' : 'grid-cols-7'} ${desktopCols === 5 ? 'sm:grid-cols-5' : desktopCols === 6 ? 'sm:grid-cols-6' : 'sm:grid-cols-7'}`;

  // autoFit action imported from utils

  const dispatch = createEventDispatcher();

  // Normalize to a unified shape
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
  
  // Viewport gate so desktop text status is not rendered at all on mobile
  let isDesktop = false;
  onMount(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => { isDesktop = mq.matches; };
    update();
    if (mq.addEventListener) mq.addEventListener('change', update); else mq.addListener(update);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', update); else mq.removeListener(update); };
  });

  // Derive start/end labels
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

  // Date columns (UTC to avoid TZ shifts)
  $: dayNum = (() => {
    const d = dayjs.utc(unified?.res_date || unified?.date);
    return d.isValid() ? d.format('D') : '';
  })();
  $: monthShort = (() => {
    const d = dayjs.utc(unified?.res_date || unified?.date);
    return d.isValid() ? d.format('MMM') : '';
  })();

  // Compact date label (e.g., "4 Nov")
  $: dateLabel = [dayNum, monthShort].filter(Boolean).join(' ');

  // Price display
  const pickPrice = (r: any): number | string | undefined => {
    if (!r) return undefined;
    const candidates = [r.price, r.total_price, r.totalPrice, r.amount, r.fee, r.cost];
    return candidates.find((v) => v !== undefined && v !== null);
  };
  // Prefer price from unified; fallback to raw
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

  // Values for price RPC when not persisted
  $: priceUid = unified?.uid || reservation?.uid;
  $: priceResDate = (() => {
    const raw = unified?.res_date || unified?.date;
    if (!raw) return undefined as unknown as string;
    // Prefer an exact ISO timestamp so breakdown can match the specific reservation row
    const d = dayjs.utc(raw);
    return d.isValid() ? d.toISOString() : String(raw);
  })();
  // Derive category/typeKey
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

  // Student count for Course/Coaching types
  const lower = (v: any) => (v ? String(v).toLowerCase() : '');
  $: typeKey = (() => {
    const ow = unified?.res_openwater || unified?.open_water || reservation?.res_openwater || reservation?.open_water;
    const pool = unified?.res_pool || unified?.pool || reservation?.res_pool || reservation?.pool;
    const classroom = unified?.res_classroom || unified?.classroom || reservation?.res_classroom || reservation?.classroom;
    return lower(ow?.open_water_type || pool?.pool_type || classroom?.classroom_type || unified?.open_water_type || unified?.pool_type || unified?.classroom_type || unified?.type || reservation?.type || unified?.res_type);
  })();
  $: studentCount = (() => {
    const ow = unified?.res_openwater || unified?.open_water || reservation?.res_openwater || reservation?.open_water;
    const pool = unified?.res_pool || unified?.pool || reservation?.res_pool || reservation?.pool;
    const classroom = unified?.res_classroom || unified?.classroom || reservation?.res_classroom || reservation?.classroom;
    return ow?.student_count ?? pool?.student_count ?? classroom?.student_count ?? unified?.student_count ?? reservation?.student_count;
  })();
  $: showStudent = (() => {
    const t = typeKey;
    return t.includes('course') || t.includes('coaching');
  })();

  const handleCancelClick = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch('cancel', reservation);
  };
  
  // Status helpers for compact mobile rendering
  $: statusRaw = (unified?.res_status || unified?.status || 'pending');
  $: statusLower = statusRaw?.toString().toLowerCase();
  $: statusColorClass = (() => {
    switch (statusLower) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-500';
      case 'rejected':
        return 'text-red-600';
      case 'approved':
        return 'text-blue-600';
      case 'completed':
        return 'text-slate-600';
      case 'ongoing':
        return 'text-indigo-600';
      default:
        return 'text-slate-400';
    }
  })();
  
  // Determine if reservation is upcoming (future). Prefer combining date + start time, else date-only.
  $: isUpcoming = (() => {
    try {
      const dateRaw = unified?.res_date || unified?.date;
      if (!dateRaw) return false;
      const dateUtc = dayjs.utc(dateRaw);
      if (!dateUtc.isValid()) return false;
      const start = startRaw ? dayjs.utc(`${dateUtc.format('YYYY-MM-DD')}T${startRaw}`) : dateUtc.endOf('day');
      return start.isAfter(dayjs());
    } catch {
      return false;
    }
  })();

  // Desktop status label: for upcoming reservations, show "Confirmed" (unless explicitly rejected/cancelled/completed)
  const toTitle = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
  $: desktopStatusLabel = (() => {
    const hardStatuses = ['rejected', 'cancelled', 'completed'];
    if (isUpcoming && !hardStatuses.includes(statusLower)) return 'Confirmed';
    return toTitle(statusRaw?.toString() || '');
  })();
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
    <div class={`grid ${gridColsClass} gap-2 sm:gap-3 md:gap-4 w-full text-[11px] sm:text-[12px] md:text-[14px] overflow-hidden`}
      use:autoFit={{ min: 9, max: 14, step: 0.25 }}
    >
      <!-- Date -->
      <div class="flex items-center justify-start text-slate-900 font-semibold min-w-0 overflow-hidden">
        <span class="whitespace-nowrap">{dateLabel}</span>
      </div>

      <!-- Type -->
      <div class="flex items-center justify-start text-slate-700 font-semibold min-w-0 overflow-hidden">
        <span class="type-badge {compact ? 'compact' : ''} whitespace-normal md:whitespace-nowrap break-words md:truncate"
          class:pool={unified.res_type === 'pool' || unified.type === 'Pool'}
          class:openwater={unified.res_type === 'open_water' || unified.type === 'Open Water'}
          class:classroom={unified.res_type === 'classroom' || unified.type === 'Classroom'}
        >
          {unified.res_type === 'open_water' ? 'Open Water' : unified.res_type === 'pool' ? 'Pool' : unified.res_type === 'classroom' ? 'Classroom' : (unified.type || '')}
        </span>
      </div>

      <!-- Student Count (course/coaching) -->
      <div class="flex items-center justify-start text-slate-600 min-w-0 overflow-hidden shrink-0">
        {#if showStudent && studentCount}
          <span class="whitespace-nowrap">{studentCount} SC</span>
        {/if}
      </div>

      <!-- Time/Depth -->
      <div class="flex items-center justify-start text-slate-600 min-w-0 overflow-visible flex-1">
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

      <!-- Status -->
      <div class="flex items-center justify-center md:justify-start min-w-0 overflow-hidden shrink-0">
        <!-- Mobile: icons only -->
        <span class="inline-flex md:hidden items-center mr-0">
          {#if statusLower === 'confirmed'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" class="text-green-600" fill="currentColor" aria-label="Confirmed">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.1 13.2-3.6-3.6 1.4-1.4 2.2 2.2 4.5-4.5 1.4 1.4-5.9 5.9Z"/>
            </svg>
          {:else if statusLower === 'pending'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" class="text-yellow-500" fill="currentColor" aria-label="Pending">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 14h-2v-2h2v2Zm0-4h-2V6h2v6Z"/>
            </svg>
          {:else if statusLower === 'rejected'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" class="text-red-600" fill="currentColor" aria-label="Rejected">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 6.5 7 7-1.4 1.4-7-7 1.4-1.4Zm7 0-7 7-1.4-1.4 7-7 1.4 1.4Z"/>
            </svg>
          {:else if statusLower === 'cancelled'}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" class="text-red-500" fill="currentColor" aria-label="Cancelled">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 10a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-8.5 0h7"/>
            </svg>
          {:else}
            <!-- Generic status dot for mobile (no text) -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" class={statusColorClass} fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="6" />
            </svg>
          {/if}
        </span>
        <!-- Desktop/tablet: show text status -->
        {#if isDesktop}
          <span class="status-badge {compact ? 'compact' : ''} whitespace-nowrap"
            class:confirmed={unified.res_status === 'confirmed'}
            class:pending={unified.res_status === 'pending'}
            class:rejected={unified.res_status === 'rejected'}
            class:approved={unified.status === 'approved'}
            class:completed={unified.status === 'completed' || unified.res_status === 'completed'}
            class:ongoing={unified.status === 'ongoing'}
          >
            {desktopStatusLabel}
          </span>
        {/if}
      </div>

      <!-- Cancel -->
      {#if showCancel}
        <div class="flex items-center justify-end w-full min-w-0 overflow-hidden">
          {#if statusLower === 'pending' || statusLower === 'confirmed'}
            <button class="btn btn-xs btn-error btn-outline btn-circle" title="Cancel reservation" aria-label="Cancel reservation" on:click={handleCancelClick}>
              ✕
            </button>
          {/if}
        </div>
      {/if}

      <!-- Price -->
      {#if showPrice}
        <!-- Price in-grid: hide on mobile when priceBelowOnMobile -->
        <div
          class="justify-self-end {priceBelowOnMobile ? 'hidden sm:flex' : 'flex'} items-center gap-2 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap shrink-0"
          use:autoFit={{ min: 9, max: 16, step: 0.5 }}
        >
          <slot name="price">
            {#if statusLower === 'cancelled'}
              P0.00
            {:else if rawPrice !== undefined && rawPrice !== null && rawPrice !== ''}
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
    
  </div>
</div>

 
