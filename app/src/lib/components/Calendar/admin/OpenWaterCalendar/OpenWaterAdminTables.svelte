<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import ReservationTable from "./ReservationTable.svelte";
  import "../../../../../styles/reservation-table.css";
  import type { Buoy } from "../../../../services/openWaterService";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { MoveReservationToBuoyPayload } from "../../../../services/openWaterService";
  import type { OpenWaterReservationView } from "../../../../types/reservationViews";
  import { moveReservationToBuoy } from "../../../../services/openWaterService";
  import { callFunction } from "../../../../utils/functions";

  export let availableBoats: string[];
  export let availableBuoys: Buoy[];
  export let buoyGroups: AdminBuoyGroup[];
  export let loading: boolean;
  export let selectedDate: string = "";
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  export let onUpdateNote: (
    groupId: number,
    note: string | null,
  ) => void = () => {};
  // Parent-provided callback to refresh assignments after server-side updates
  export let onRefreshAssignments: () => void;
  // When true, render in view-only mode (no edits or moves)
  export let readOnly: boolean = false;
  export let currentUserId: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let isResizing = false;
  let currentColumn: string | null = null;
  let startX = 0;
  let startWidth = 0;
  let movingReservation = false;
  let lockInProgress = false;

  // Initialize boat capacity arrays
  type BoatStat = { name: string; totalDivers: number; isAssigned: boolean };
  let amBoatCapacity: BoatStat[] = [];
  let pmBoatCapacity: BoatStat[] = [];

  $: effectiveLoading = loading || lockInProgress;

  // Calculate boat capacity and assignments for each time period
  $: if (buoyGroups && availableBoats) {
    amBoatCapacity = calculateBoatCapacity("AM");
    pmBoatCapacity = calculateBoatCapacity("PM");
  }

  function calculateBoatCapacity(timePeriod: "AM" | "PM"): BoatStat[] {
    const boatStats: BoatStat[] = [];

    // Create numbered boats (1-4)
    for (let i = 1; i <= 4; i++) {
      const boatName = `Boat ${i}`;
      boatStats.push({
        name: boatName,
        totalDivers: 0,
        isAssigned: false,
      });
    }

    // Safety check - ensure we have valid data
    if (!buoyGroups || !Array.isArray(buoyGroups)) {
      return boatStats;
    }

    // Count divers for each boat in the specified time period
    buoyGroups
      .filter((group) => group && group.time_period === timePeriod)
      .forEach((group) => {
        if (group.boat && group.boat.trim() !== "") {
          // Try exact match first
          let boatIndex = availableBoats.indexOf(group.boat);

          // If no exact match, try to find by boat number
          if (boatIndex === -1) {
            const boatNumber = group.boat.match(/\d+/)?.[0];
            if (boatNumber) {
              boatIndex = availableBoats.indexOf(`Boat ${boatNumber}`);
            }
          }

          if (boatIndex !== -1 && boatIndex < boatStats.length) {
            const boatStat = boatStats[boatIndex]!;

            const reservations = Array.isArray(group.reservations)
              ? group.reservations
              : [];

            let groupDivers = 0;
            for (const reservation of reservations) {
              const typeFromGroup = group.open_water_type ?? null;
              const typeFromReservation = reservation.open_water_type ?? null;
              const normalizedType = (
                typeFromReservation ||
                typeFromGroup ||
                ""
              ).toLowerCase();

              if (normalizedType === "course_coaching") {
                const n = reservation.student_count ?? 0;
                groupDivers += 1 + n;
              } else {
                groupDivers += 1;
              }
            }

            boatStat.totalDivers += groupDivers;
            boatStat.isAssigned = true;
          }
        }
      });

    return boatStats;
  }

  function handleMouseDown(event: MouseEvent, column: string) {
    if (
      event.target instanceof HTMLElement &&
      event.target.classList.contains("resize-handle")
    ) {
      isResizing = true;
      currentColumn = column;
      startX = event.clientX;
      startWidth =
        (event.target.closest("th") as HTMLElement)?.offsetWidth || 0;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      event.preventDefault();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isResizing || !currentColumn) return;
    const deltaX = event.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX);
    const tables = document.querySelectorAll(
      '.reservation-card [role="table"]',
    );
    tables.forEach((table) => {
      const elements = table.querySelectorAll(
        `[data-column="${currentColumn}"]`,
      );
      elements.forEach((el) => {
        (el as HTMLElement).style.width = `${newWidth}px`;
      });
    });
  }

  function handleMouseUp() {
    isResizing = false;
    currentColumn = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function handleGroupClick(event: CustomEvent<any>) {
    dispatch("groupClick", event.detail);
  }

  function handleStatusClick(
    event: CustomEvent<{
      reservation: OpenWaterReservationView;
      displayName?: string | null;
    }>,
  ) {
    dispatch("statusClick", event.detail);
  }

  async function handleMoveReservationToBuoy(
    event: CustomEvent<MoveReservationToBuoyPayload>,
  ) {
    if (readOnly) return; // Block moves in view-only mode
    if (movingReservation) return;
    movingReservation = true;
    try {
      // Call edge function to move reservation between buoys
      await moveReservationToBuoy(event.detail);

      // Ensure a very short UX pause so backend writes/auto-assignments settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (onRefreshAssignments) {
        await onRefreshAssignments();
      }
    } catch (error) {
      console.error("Error moving reservation to buoy:", error);
      alert(
        "Error moving reservation to buoy: " +
          ((error as Error)?.message ?? "Unknown error"),
      );
    } finally {
      movingReservation = false;
    }
  }

  async function handleLock(timePeriod: "AM" | "PM") {
    if (readOnly || !selectedDate || lockInProgress) return;
    lockInProgress = true;
    try {
      const res = await callFunction<
        { res_date: string; time_period: string },
        unknown
      >("lock-ow-reservations", {
        res_date: selectedDate,
        time_period: timePeriod,
      });

      if ((res as any)?.error) {
        throw new Error(String((res as any).error));
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (onRefreshAssignments) {
        await onRefreshAssignments();
      }
    } catch (error) {
      console.error("Error locking open water reservations:", error);
      alert(
        "Error locking open water reservations: " +
          ((error as Error)?.message ?? "Unknown error"),
      );
    } finally {
      lockInProgress = false;
    }
  }

  async function handleUnlock(timePeriod: "AM" | "PM") {
    if (readOnly || !selectedDate || lockInProgress) return;
    lockInProgress = true;
    try {
      const res = await callFunction<
        { res_date: string; time_period: string },
        unknown
      >("unlock-ow-reservations", {
        res_date: selectedDate,
        time_period: timePeriod,
      });

      if ((res as any)?.error) {
        throw new Error(String((res as any).error));
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (onRefreshAssignments) {
        await onRefreshAssignments();
      }
    } catch (error) {
      console.error("Error unlocking open water reservations:", error);
      alert(
        "Error unlocking open water reservations: " +
          ((error as Error)?.message ?? "Unknown error"),
      );
    } finally {
      lockInProgress = false;
    }
  }

  import { availabilityApi } from "../../../../api/availabilityApi";
  import type { AvailabilityBlock } from "../../../../api/availabilityApi";

  async function handleAutoAssign(timePeriod: "AM" | "PM") {
    if (readOnly || !selectedDate) return;
    try {
      const res = await callFunction<
        { res_date: string; time_period: string },
        unknown
      >("auto-assign-buoy", {
        res_date: selectedDate,
        time_period: timePeriod,
      });

      if ((res as any)?.error) {
        throw new Error(String((res as any).error));
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      if (onRefreshAssignments) {
        await onRefreshAssignments();
      }
    } catch (error) {
      console.error("Error auto-assigning buoys:", error);
      alert(
        "Error auto-assigning buoys: " +
          ((error as Error)?.message ?? "Unknown error"),
      );
    }
  }

  let availabilities: AvailabilityBlock[] = [];
  let togglingFull = false;

  async function loadAvailabilities() {
    if (!selectedDate) return;
    const { success, data } = await availabilityApi.list();
    if (success && data) {
      availabilities = data.filter(
        (a) => a.date === selectedDate && a.category === "openwater",
      );
    }
  }

  async function handleToggleFull(timePeriod: "AM" | "PM") {
    if (readOnly || !selectedDate || togglingFull) return;
    togglingFull = true;
    try {
      const { success, error } = await availabilityApi.toggle({
        date: selectedDate,
        category: "openwater",
        type: timePeriod,
      });

      if (!success) {
        alert("Error toggling full status: " + (error ?? "Unknown error"));
        return;
      }

      await loadAvailabilities();
    } catch (error) {
      console.error("Error toggling full status:", error);
    } finally {
      togglingFull = false;
    }
  }

  $: if (selectedDate) {
    loadAvailabilities();
  }

  $: amFull = availabilities.some((a) => a.type === "AM" && !a.available);
  $: pmFull = availabilities.some((a) => a.type === "PM" && !a.available);
</script>

<!-- Reservation Tables Section -->
<div class="grid grid-cols-1 gap-2">
  <!-- AM Reservations -->
  <ReservationTable
    timePeriod="AM"
    boatCapacity={amBoatCapacity}
    {buoyGroups}
    {availableBuoys}
    {availableBoats}
    {effectiveLoading}
    {readOnly}
    {currentUserId}
    {onUpdateBuoy}
    {onUpdateBoat}
    {onUpdateNote}
    onAutoAssign={handleAutoAssign}
    onLock={handleLock}
    onUnlock={handleUnlock}
    onMouseDown={handleMouseDown}
    isFull={amFull}
    onToggleFull={handleToggleFull}
    on:groupClick={handleGroupClick}
    on:moveReservationToBuoy={handleMoveReservationToBuoy}
    on:statusClick={handleStatusClick}
  />

  <!-- PM Reservations -->
  <ReservationTable
    timePeriod="PM"
    boatCapacity={pmBoatCapacity}
    {buoyGroups}
    {availableBuoys}
    {availableBoats}
    {effectiveLoading}
    {readOnly}
    {currentUserId}
    {onUpdateBuoy}
    {onUpdateBoat}
    {onUpdateNote}
    onAutoAssign={handleAutoAssign}
    onLock={handleLock}
    onUnlock={handleUnlock}
    onMouseDown={handleMouseDown}
    isFull={pmFull}
    onToggleFull={handleToggleFull}
    on:groupClick={handleGroupClick}
    on:statusClick={handleStatusClick}
  />
</div>

{#if movingReservation || lockInProgress}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-base-300/60 backdrop-blur-sm"
  >
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
{/if}
