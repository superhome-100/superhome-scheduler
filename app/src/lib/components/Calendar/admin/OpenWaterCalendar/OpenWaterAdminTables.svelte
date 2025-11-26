<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import ReservationTable from "./ReservationTable.svelte";
  import "../../../../../styles/reservation-table.css";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { MoveReservationToBuoyPayload } from "../../../../services/openWaterService";
  import { moveReservationToBuoy } from "../../../../services/openWaterService";

  export let availableBoats: string[];
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let buoyGroups: AdminBuoyGroup[];
  export let loading: boolean;
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  // Parent-provided callback to refresh assignments after server-side updates
  export let onRefreshAssignments: () => void;

  const dispatch = createEventDispatcher();

  let isResizing = false;
  let currentColumn: string | null = null;
  let startX = 0;
  let startWidth = 0;
  let movingReservation = false;

  // Initialize boat capacity arrays
  type BoatStat = { name: string; totalDivers: number; isAssigned: boolean };
  let amBoatCapacity: BoatStat[] = [];
  let pmBoatCapacity: BoatStat[] = [];

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
            // Prefer server-computed boat_count if available (handles Course/Coaching = 1 + students)
            const diverCount =
              typeof group.boat_count === "number"
                ? group.boat_count
                : group.member_names?.filter(
                    (name: string | null) => name && name.trim() !== ""
                  ).length || 0;
            boatStat.totalDivers += diverCount;
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
      '.reservation-card [role="table"]'
    );
    tables.forEach((table) => {
      const elements = table.querySelectorAll(
        `[data-column="${currentColumn}"]`
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

  async function handleMoveReservationToBuoy(
    event: CustomEvent<MoveReservationToBuoyPayload>
  ) {
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
          ((error as Error)?.message ?? "Unknown error")
      );
    } finally {
      movingReservation = false;
    }
  }
</script>

<!-- Reservation Tables Section -->
<div class="grid grid-cols-1 gap-4 lg:gap-6">
  <!-- AM Reservations -->
  <ReservationTable
    timePeriod="AM"
    boatCapacity={amBoatCapacity}
    {buoyGroups}
    {availableBuoys}
    {availableBoats}
    {loading}
    {onUpdateBuoy}
    {onUpdateBoat}
    onMouseDown={handleMouseDown}
    on:groupClick={handleGroupClick}
    on:moveReservationToBuoy={handleMoveReservationToBuoy}
  />

  <!-- PM Reservations -->
  <ReservationTable
    timePeriod="PM"
    boatCapacity={pmBoatCapacity}
    {buoyGroups}
    {availableBuoys}
    {availableBoats}
    {loading}
    {onUpdateBuoy}
    {onUpdateBoat}
    onMouseDown={handleMouseDown}
    on:groupClick={handleGroupClick}
  />
</div>

{#if movingReservation}
  <div
    class="fixed inset-0 z-[70] flex items-center justify-center bg-base-300/60 backdrop-blur-sm"
  >
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>
{/if}
