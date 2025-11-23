<script lang="ts">
  import dayjs from 'dayjs';
  import ReservationDetailsModal from '../../../ReservationDetailsModal/ReservationDetailsModal.svelte';
  import {
    toMin,
    getStartHHmm,
    getEndHHmm,
    getRoom,
    buildSlotMins,
    assignProvisionalRooms,
    resKey as buildResKey
  } from './utils';
  import { hourSlotsFrom, computeGridMetrics, rectForRange } from '$lib/calendar/timeGrid';
  
  export let timeSlots: string[];
  export let reservations: any[];
  // Optional room labels from parent/settings; fallback to ['1','2','3']
  export let rooms: string[] = [];
  // Optional current user id for labeling own reservations as "You"
  export let currentUserId: string | undefined = undefined;
  // Admin mode - shows full names instead of generic labels
  export let isAdmin: boolean = false;

  // Modal state for reservation details
  let isModalOpen = false;
  let selectedReservation: any = null;

  const handleReservationClick = (reservation: any) => {
    console.log('ClassroomCalendar: Reservation clicked', { isAdmin, reservation });
    selectedReservation = reservation;
    isModalOpen = true;
  };

  const closeModal = () => {
    isModalOpen = false;
    selectedReservation = null;
  };

  // Rooms to display
  $: ROOMS = (rooms && rooms.length > 0) ? rooms.map(String) : ['1','2','3'];

  // User display helper (kept local for flexibility)
  const getResUserId = (res: any): string | undefined => (
    (res?.uid && String(res.uid)) ||
    (res?.user_id && String(res.user_id)) ||
    (res?.user?.id && String(res.user.id)) ||
    (res?.user_profiles?.id && String(res.user_profiles.id))
  );

  const getDisplayName = (res: any): string => {
    const uid = getResUserId(res);
    // Only show "You" in non-admin views
    if (!isAdmin && currentUserId && uid && String(uid) === String(currentUserId)) return 'You';
    if (isAdmin) {
      const nick = res?.user_profiles?.nickname;
      if (nick) return nick;
      const fullName = res?.user_profiles?.name;
      if (fullName) return fullName;
      const username = res?.user_profiles?.username || res?.username;
      const email = res?.user_profiles?.email || res?.email;
      if (username) return username;
      if (email) return email.split('@')[0];
      return 'Unknown User';
    } else {
      let name = res?.user_profiles?.nickname || res?.user_profiles?.name || res?.user_profiles?.username || (Array.isArray(res?.member_names) && res.member_names[0]) || res?.nickname || res?.username || res?.name || res?.title || '';
      const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const hex24 = /^[0-9a-f]{24}$/i;
      const hex32 = /^[0-9a-f]{32}$/i;
      if (!name || uuidV4.test(String(name)) || hex24.test(String(name)) || hex32.test(String(name))) name = 'Member';
      return name;
    }
  };

  // Extract classroom student count from various shapes
  const getStudentCount = (res: any): number => {
    const n = res?.student_count ?? res?.res_classroom?.student_count ?? null;
    const parsed = typeof n === 'string' ? parseInt(n, 10) : n;
    return Number.isFinite(parsed) && (parsed as number) > 0 ? (parsed as number) : 0;
  };

  // Compose display label with optional "+ N" suffix
  const getDisplayLabel = (res: any): string => {
    const base = getDisplayName(res);
    const count = getStudentCount(res);
    return count > 0 ? `${base} + ${count}` : base;
  };

  // Derive hour slots from provided timeSlots (shared)
  $: hourSlots = hourSlotsFrom(timeSlots || []);

  // Grid row template
  const HEADER_ROW_PX = 40;
  const HOUR_ROW_PX = 60;
  $: rowTemplate = `${HEADER_ROW_PX}px repeat(${hourSlots.length}, ${HOUR_ROW_PX}px)`;

  // Build slot minutes array and compute display reservations with room assignment
  $: slotMins = buildSlotMins(timeSlots);
  $: displayReservations = assignProvisionalRooms(reservations || [], ROOMS, slotMins);

  // Stable key helper
  const resKey = (r: any) => buildResKey(r, ROOMS);

  // Grid vertical metrics (shared)
  $: ({ gridStartMin, gridEndMin } = computeGridMetrics(hourSlots, HOUR_ROW_PX));

  // Compute single rectangle for a reservation within full column (shared)
  function rectForReservation(res: any) {
    const s = getStartHHmm(res);
    const e = getEndHHmm(res);
    return rectForRange(s, e, gridStartMin, gridEndMin, HOUR_ROW_PX);
  }
</script>

<div class="bg-white rounded-lg border border-base-300 overflow-hidden shadow-sm">
  <!-- Wrapper to stack base grid and overlay grid -->
  <div class="relative max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
    <!-- Base Table Grid (cells and borders) -->
    <div class="grid" style={`grid-template-columns: 80px repeat(${ROOMS.length}, 1fr); grid-template-rows: ${rowTemplate};`}>
    <!-- Calendar Header -->
    <div class="box-border p-2 sm:p-3 text-center font-semibold text-base-content border-r border-base-300 text-xs sm:text-sm bg-base-200 border-b-2 border-base-300">
      Time
    </div>
    {#each ROOMS as roomLabel, ridx}
      <div class="box-border p-2 sm:p-3 text-center font-semibold text-base-content border-r border-base-300 last:border-r-0 text-xs sm:text-sm bg-base-200 border-b-2 border-base-300">
        Room {roomLabel}
      </div>
    {/each}

    <!-- Calendar Grid Rows (per hour) -->
    {#each hourSlots as hourLabel}
      <div class="box-border text-center text-xs sm:text-sm text-base-content/70 bg-base-200 border-r border-base-300 flex items-center justify-center border-b border-base-300" style="grid-column: 1 / 2; height: ${HOUR_ROW_PX}px;">
        {hourLabel}
      </div>
      {#each ROOMS as _roomLabel, ridx}
        <div
          class="relative box-border border-r border-base-300 last:border-r-0 border-b-2 border-base-300"
          style={`grid-column: ${ridx + 2} / ${ridx + 3}; height: ${HOUR_ROW_PX}px;`}
        >
          <!-- Mid 30-min divider line inside the hour cell -->
          <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-base-300/70"></div>
        </div>
      {/each}
    {/each}
    </div>

    <!-- Absolute overlay grid aligned with hour rows (one card per booking, spanning vertically) -->
    <div class="pointer-events-none absolute inset-0 grid" style={`grid-template-columns: 80px repeat(${ROOMS.length}, 1fr); grid-template-rows: ${rowTemplate}; z-index: 10;`}>
      {#if displayReservations && displayReservations.length}
        {#each ROOMS as _roomLabel, ridx}
          <!-- Column overlay covering all hour rows for this room -->
          <div class="relative" style={`grid-column: ${ridx + 2} / ${ridx + 3}; grid-row: 2 / ${2 + hourSlots.length};`}>
            {#each (
              displayReservations
                .filter(r => {
                  const explicitLabel = String(getRoom(r) || '');
                  const explicitIdx = explicitLabel ? ROOMS.indexOf(explicitLabel) : -1;
                  const dIdx = (r.__display_room_idx ?? explicitIdx);
                  return dIdx === ridx;
                })
                .map((r, rIdx) => ({ r, rIdx, rect: rectForReservation(r) }))
                .filter(x => !!x.rect)
                .sort((a, b) => (a.rect!.topPx - b.rect!.topPx))
            ) as item (`${resKey(item.r)}-${item.rIdx}`)}
              {@const reservation = item.r}
              {@const rect = item.rect}
              {#if rect}
                <div
                  class="pointer-events-auto absolute left-1 right-1 rounded-lg text-[0.7rem] sm:text-sm cursor-pointer hover:font-semibold shadow-sm bg-gradient-to-br from-red-100 to-red-200 text-red-900 border border-red-300 flex flex-col justify-center p-2 overflow-hidden z-10"
                  style={`top: ${rect.topPx}px; height: ${rect.heightPx}px;`}
                  on:click={() => handleReservationClick(reservation)}
                  on:keydown={(e) => e.key === 'Enter' && handleReservationClick(reservation)}
                  role="button"
                  tabindex="0"
                  aria-label="View reservation details"
                >
                  <div class="flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="badge h-2 w-2 p-0 bg-green-400 border-transparent"></span>
                      <div class="font-medium truncate">{getDisplayLabel(reservation)}</div>
                    </div>
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

<!-- Reservation Details Modal -->
<ReservationDetailsModal 
  bind:isOpen={isModalOpen}
  reservation={selectedReservation}
  {isAdmin}
  on:close={closeModal}
/>
