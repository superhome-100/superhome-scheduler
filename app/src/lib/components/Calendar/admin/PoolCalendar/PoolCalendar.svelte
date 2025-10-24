<script lang="ts">
  import { hourSlotsFrom, computeGridMetrics, rectForRange, buildSlotMins } from '$lib/calendar/timeGrid';
  import { getStartHHmm, getEndHHmm, getLane, assignProvisionalLanes, resKey } from './poolUtils';

  export let timeSlots: string[];
  export let reservations: any[];
  export let lanes: string[] = Array.from({ length: 8 }, (_, i) => String(i + 1));

  // Derived hour slots and grid rows
  $: hourSlots = hourSlotsFrom(timeSlots || []);
  const HEADER_ROW_PX = 40;
  const HOUR_ROW_PX = 60;
  $: rowTemplate = `${HEADER_ROW_PX}px repeat(${hourSlots.length}, ${HOUR_ROW_PX}px)`;

  // Build slot minutes and assign lanes for display
  $: slotMins = buildSlotMins(timeSlots);
  $: displayReservations = assignProvisionalLanes(reservations || [], lanes, slotMins);

  // Grid vertical metrics
  $: ({ gridStartMin, gridEndMin } = computeGridMetrics(hourSlots, HOUR_ROW_PX));

  function rectForReservation(res: any) {
    const s = getStartHHmm(res);
    const e = getEndHHmm(res);
    return rectForRange(s, e, gridStartMin, gridEndMin, HOUR_ROW_PX);
  }
</script>

<div class="bg-white rounded-lg border border-base-300 overflow-hidden shadow-sm">
  <!-- Wrapper grid with scroll -->
  <div class="relative max-h-[60vh] overflow-y-auto">
    <!-- Base grid -->
    <div class="grid" style={`grid-template-columns: 80px repeat(${lanes.length}, 1fr); grid-template-rows: ${rowTemplate};`}>
      <!-- Header row -->
      <div class="box-border p-2 text-center font-semibold text-base-content border-r border-base-300 bg-base-200 border-b-2 border-base-300">
        Time
      </div>
      {#each lanes as lane}
        <div class="box-border p-2 text-center font-semibold text-base-content border-r border-base-300 last:border-r-0 bg-base-200 border-b-2 border-base-300">
          Lane {lane}
        </div>
      {/each}

      <!-- Hour rows -->
      {#each hourSlots as hourLabel}
        <div class="box-border text-center text-sm text-base-content/70 bg-base-200 border-r border-base-300 flex items-center justify-center border-b border-base-300" style={`height: ${HOUR_ROW_PX}px;`}>
          {hourLabel}
        </div>
        {#each lanes as _lane}
          <div class="relative box-border border-r border-base-300 last:border-r-0 border-b-2 border-base-300" style={`height: ${HOUR_ROW_PX}px;`}>
            <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-base-300/70"></div>
          </div>
        {/each}
      {/each}
    </div>

    <!-- Overlay per lane; one card per booking spanning vertically -->
    <div class="pointer-events-none absolute inset-0 grid" style={`grid-template-columns: 80px repeat(${lanes.length}, 1fr); grid-template-rows: ${rowTemplate}; z-index: 10;`}>
      {#if displayReservations && displayReservations.length}
        {#each lanes as laneLabel, lidx}
          <div class="relative" style={`grid-column: ${lidx + 2} / ${lidx + 3}; grid-row: 2 / ${2 + hourSlots.length};`}>
            {#each (
              displayReservations
                .filter(r => {
                  const explicit = String(getLane(r) || '');
                  const explicitIdx = explicit ? lanes.indexOf(explicit) : -1;
                  const dIdx = (r.__display_lane_idx ?? explicitIdx);
                  return dIdx === lidx;
                })
                .map((r, rIdx) => ({ r, rIdx, rect: rectForReservation(r) }))
                .filter(x => !!x.rect)
                .sort((a, b) => (a.rect!.topPx - b.rect!.topPx))
            ) as item (`${resKey(item.r, lanes)}-${item.rIdx}`)}
              {@const reservation = item.r}
              {@const rect = item.rect}
              {#if rect}
                <div
                  class="pointer-events-auto absolute left-1 right-1 rounded-lg text-[0.7rem] sm:text-sm cursor-pointer hover:font-semibold shadow-sm bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border border-blue-300 flex flex-col justify-center p-2 overflow-hidden z-10"
                  style={`top: ${rect.topPx}px; height: ${rect.heightPx}px;`}
                  role="button"
                  tabindex="0"
                  aria-label="View pool reservation details"
                >
                  <div class="flex items-center gap-2 justify-between">
                    <div class="font-medium truncate">{reservation.user_profiles?.name || 'Unknown'}</div>
                    <div class="shrink-0 text-[10px] sm:text-xs text-base-content/70">
                      {getStartHHmm(reservation)}–{getEndHHmm(reservation)}
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
