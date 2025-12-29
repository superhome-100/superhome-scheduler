<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    hourSlotsFrom,
    computeGridMetrics,
    rectForRange,
    buildSlotMins,
    toMin,
  } from "$lib/calendar/timeGrid";
  import {
    getStartHHmm,
    getEndHHmm,
    getLane,
    assignProvisionalLanes,
    resKey,
    getStudentCount as getStudentCountUtil,
    getPoolType as getPoolTypeUtil,
  } from "./poolUtils";
  import type { PoolResLike } from "./poolUtils";
  import ReservationDetailsModal from "../../../ReservationDetailsModal/ReservationDetailsModal.svelte";

  export let timeSlots: string[];
  export let reservations: PoolResLike[];
  export let lanes: string[] = Array.from({ length: 8 }, (_, i) =>
    String(i + 1),
  );
  // Optional current user id for labeling own reservations as "You"
  export let currentUserId: string | undefined = undefined;
  // Admin mode - shows full names instead of generic labels
  export let isAdmin: boolean = false;
  // Dynamic label for lanes (e.g., "Slot", "Lane")
  export let poolLabel: string = "Lane";

  const dispatch = createEventDispatcher();

  // Modal state and handlers (mirror ClassroomCalendar)
  let isModalOpen = false;
  let selectedReservation: PoolResLike | null = null;

  const handleReservationClick = (reservation: PoolResLike) => {
    selectedReservation = reservation;
    isModalOpen = true;
  };

  const closeModal = () => {
    isModalOpen = false;
    selectedReservation = null;
  };

  // Derived hour slots and grid rows
  $: sortedTimeSlots = (timeSlots || [])
    .slice()
    .sort(
      (a, b) =>
        toMin(String(a).match(/\d{2}:\d{2}/)?.[0] || "00:00") -
        toMin(String(b).match(/\d{2}:\d{2}/)?.[0] || "00:00"),
    );

  $: hourSlots = hourSlotsFrom(sortedTimeSlots);
  const HEADER_ROW_PX = 40;
  const HOUR_ROW_PX = 60;
  $: rowTemplate = `${HEADER_ROW_PX}px repeat(${hourSlots.length}, ${HOUR_ROW_PX}px)`;

  // Build slot minutes and assign lanes for display
  $: slotMins = buildSlotMins(sortedTimeSlots);
  $: displayReservations = assignProvisionalLanes(
    reservations || [],
    lanes,
    slotMins,
  );

  // Grid vertical metrics
  $: ({ gridStartMin, gridEndMin } = computeGridMetrics(
    hourSlots,
    HOUR_ROW_PX,
  ));

  function rectForReservation(res: PoolResLike) {
    const s = getStartHHmm(res);
    const e = getEndHHmm(res);
    return rectForRange(s, e, gridStartMin, gridEndMin, HOUR_ROW_PX);
  }

  // User id extraction and display helpers (aligned with ClassroomCalendar)
  const getResUserId = (res: PoolResLike): string | undefined => {
    if (res?.uid != null) return String(res.uid);
    if (res?.user_id != null) return String(res.user_id);
    if (res?.user?.id != null) return String(res.user.id);
    if (res?.user_profiles?.id != null) return String(res.user_profiles.id);
    return undefined;
  };

  const getDisplayName = (res: PoolResLike): string => {
    const uid = getResUserId(res);
    // Only show "You" in non-admin views
    if (
      !isAdmin &&
      currentUserId &&
      uid &&
      String(uid) === String(currentUserId)
    )
      return "You";
    if (isAdmin) {
      const nick = res?.user_profiles?.nickname;
      if (nick) return nick;
      const fullName = res?.user_profiles?.name;
      if (fullName) return fullName;
      const username = res?.username;
      const email = res?.email;
      if (username) return username as string;
      if (email) return (email as string).split("@")[0];
      // Fallback to any local fields if present
      const local = res?.nickname || res?.name || res?.title || "";
      if (local) return String(local);
      // Final generic fallback to avoid "Unknown User" in admin view when RLS hides profile
      return "Member";
    } else {
      let name =
        res?.user_profiles?.nickname ||
        res?.user_profiles?.name ||
        res?.user_profiles?.username ||
        res?.nickname ||
        res?.username ||
        res?.name ||
        res?.title ||
        "";
      const uuidV4 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const hex24 = /^[0-9a-f]{24}$/i;
      const hex32 = /^[0-9a-f]{32}$/i;
      if (
        !name ||
        uuidV4.test(String(name)) ||
        hex24.test(String(name)) ||
        hex32.test(String(name))
      )
        name = "Member";
      return name;
    }
  };

  const getStudentCount = (res: PoolResLike): number =>
    getStudentCountUtil(res);

  const getPoolType = (res: PoolResLike): string | null => getPoolTypeUtil(res);

  // Display label with optional + N suffix (Course/Coaching style)
  const getDisplayLabel = (res: PoolResLike): string => {
    const base = getDisplayName(res);
    const count = getStudentCount(res);
    // Show suffix whenever a positive student_count exists. Keep label compact: "Base + N"
    return count > 0 ? `${base} + ${count}` : base;
  };

  const getResStatus = (res: PoolResLike): string =>
    String(
      (res as any)?.res_status ?? (res as any)?.status ?? "",
    ).toLowerCase();

  const cardClassFor = (res: PoolResLike): string => {
    const s = getResStatus(res);
    if (s === "pending") {
      return "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-900 border border-orange-300";
    }
    return "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border border-blue-300";
  };
</script>

<div
  class="bg-white rounded-lg border border-base-300 overflow-hidden shadow-sm"
>
  <!-- Wrapper grid with scroll -->
  <div class="relative">
    <!-- Base grid -->
    <div
      class="grid"
      style={`grid-template-columns: 80px repeat(${lanes.length}, 1fr); grid-template-rows: ${rowTemplate};`}
    >
      <!-- Header row -->
      <div
        class="box-border p-2 text-center font-semibold text-base-content border-r border-base-300 bg-base-200 border-b-2"
      >
        Time
      </div>
      {#each lanes as lane}
        <div
          class="box-border p-2 text-center font-semibold text-base-content border-r border-base-300 last:border-r-0 bg-base-200 border-b-2"
        >
          <span class="hidden sm:inline">{poolLabel} &nbsp;</span>{lane}
        </div>
      {/each}

      <!-- Hour rows -->
      {#each hourSlots as hourLabel}
        <div
          class="box-border text-center text-sm text-base-content/70 bg-base-200 border-r border-base-300 flex items-center justify-center border-b"
          style={`height: ${HOUR_ROW_PX}px;`}
        >
          {hourLabel}
        </div>
        {#each lanes as _lane}
          <div
            class="relative box-border border-r border-base-300 last:border-r-0 border-b-2"
            style={`height: ${HOUR_ROW_PX}px;`}
          >
            <div
              class="absolute top-1/2 left-0 right-0 h-[1px] bg-base-300/70"
            ></div>
          </div>
        {/each}
      {/each}
    </div>

    <!-- Overlay: one element per reservation spanning columns = number of people -->
    <div
      class="pointer-events-none absolute inset-0 grid"
      style={`grid-template-columns: 80px repeat(${lanes.length}, 1fr); grid-template-rows: ${rowTemplate}; z-index: 10;`}
    >
      {#if displayReservations && displayReservations.length}
        {#each displayReservations
          .map((r, rIdx) => ({ r, rIdx, rect: rectForReservation(r) }))
          .filter((x) => !!x.rect && typeof x.r.__display_lane_idx === "number")
          .sort((a, b) => a.rect!.topPx - b.rect!.topPx) as item (`${resKey(item.r, lanes)}-${item.rIdx}`)}
          {@const reservation = item.r}
          {@const rect = item.rect}
          {@const startLane = reservation.__display_lane_idx as number}
          {@const span = Math.max(1, Number(reservation.__display_span ?? 1))}
          {#if rect}
            <div
              class="relative"
              style={`grid-column: ${startLane + 2} / ${startLane + 2 + span}; grid-row: 2 / ${2 + hourSlots.length};`}
            >
              <div
                class={`pointer-events-auto absolute left-1 right-1 rounded-lg text-[0.7rem] sm:text-sm cursor-pointer hover:font-semibold ${cardClassFor(reservation)} flex flex-col justify-center p-2 overflow-hidden z-10`}
                style={`top: ${rect.topPx}px; height: ${rect.heightPx}px;`}
                on:click={() => handleReservationClick(reservation)}
                on:keydown={(e) =>
                  e.key === "Enter" && handleReservationClick(reservation)}
                role="button"
                tabindex="0"
                aria-label="View pool reservation details"
              >
                <div class="flex items-center justify-center">
                  <div class="font-medium truncate text-center">
                    {getDisplayLabel(reservation)}
                  </div>
                </div>
              </div>
            </div>
          {/if}
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
  {currentUserId}
  on:close={closeModal}
  on:edit={() => {
    if (selectedReservation) {
      dispatch("editReservation", selectedReservation);
    }
    closeModal();
  }}
/>
