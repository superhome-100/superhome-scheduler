<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { OpenWaterReservationView } from "../../../../types/reservationViews";

  export let buoyGroup: AdminBuoyGroup;
  export let availableBuoys: { buoy_name: string; max_depth: number }[] = [];

  const dispatch = createEventDispatcher();

  function handleGroupClick() {
    dispatch("groupClick", {
      groupId: buoyGroup.id,
      resDate: buoyGroup.res_date,
      timePeriod: buoyGroup.time_period,
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      handleGroupClick();
    }
  }

  $: nonEmptyNames = (buoyGroup?.member_names ?? []).filter(
    (x: string | null) => x && x.trim() !== ""
  );

  $: primaryName = nonEmptyNames[0] ?? "Unknown";

  $: studentCount =
    buoyGroup?.open_water_type === "course_coaching"
      ? Math.max((buoyGroup.boat_count ?? 1) - 1, 0)
      : 0;

  $: memberDisplayNames =
    buoyGroup?.open_water_type === "course_coaching"
      ? [
          `${primaryName} + ${studentCount}`,
          ...nonEmptyNames.slice(1),
        ]
      : nonEmptyNames.length
      ? nonEmptyNames
      : [primaryName];

  $: reservations = buoyGroup.reservations;

  // Move-to-buoy dialog state
  let showMoveDialog = false;
  let selectedReservation: OpenWaterReservationView | null = null;
  let targetBuoyName: string | null = null;

  $: moveTargets = (availableBuoys || [])
    .map((b) => b.buoy_name)
    .filter((name) => name && name !== buoyGroup.buoy_name);

  function getStatusColorClass(status: string | null | undefined): string {
    const normalized = (status ?? "").toLowerCase();
    if (normalized === "confirmed" || normalized === "approved") {
      return "superhome-bg-success";
    }
    if (normalized === "pending") {
      return "superhome-bg-warning";
    }
    if (normalized === "rejected" || normalized === "cancelled") {
      return "superhome-bg-error";
    }
    // Neutral/unknown status
    return "bg-base-300";
  }

  function openMoveDialog(reservation: OpenWaterReservationView) {
    selectedReservation = reservation;
    targetBuoyName = null;
    showMoveDialog = true;
  }

  function closeMoveDialog() {
    showMoveDialog = false;
    selectedReservation = null;
    targetBuoyName = null;
  }

  function confirmMove() {
    if (!selectedReservation || !targetBuoyName) return;
    dispatch("moveReservationToBuoy", {
      reservation_id: selectedReservation.uid,
      buoy_id: targetBuoyName,
      res_date: selectedReservation.res_date,
      time_period: buoyGroup.time_period,
    });
    closeMoveDialog();
  }
</script>

{#if buoyGroup.member_names?.length}
  <div
    class="relative hover:bg-base-200/50 transition-all duration-200 divers-group-box cursor-pointer"
    role="button"
    tabindex="0"
    aria-label="View group reservation details"
    on:click={handleGroupClick}
    on:keydown={handleKeyDown}
  >
    <!-- Debug Logging for Divers Group Box -->
    {console.log("🔍 DEBUG - Divers Group Box:", {
      groupId: buoyGroup.id,
      displayNames: buoyGroup.member_names,
      openWaterType: buoyGroup.open_water_type,
      boatCount: buoyGroup.boat_count,
      studentCount:
        buoyGroup.open_water_type === "course_coaching"
          ? Math.max((buoyGroup.boat_count ?? 1) - 1, 0)
          : "N/A",
      memberCount: buoyGroup.member_names?.length || 0,
      timePeriod: buoyGroup.time_period,
    })}
    <!-- Open Water Type Display Logic -->
    <div class="space-y-1 flex flex-col items-start w-full">
      {#each reservations as reservation, index}
        <div class="flex items-center gap-2 text-sm w-full">
          <div
            class={`res-status-marker w-2 h-2 rounded-full flex-shrink-0 ${getStatusColorClass(
              reservation?.res_status ?? null
            )}`}
          ></div>
          <span class="font-medium text-gray-800 flex-1 truncate">
            {memberDisplayNames[index] ?? primaryName}
          </span>
          <button
            type="button"
            class="btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6 flex items-center justify-center"
            on:click|stopPropagation={() => openMoveDialog(reservation)}
            aria-label="Move to buoy"
          >
            ⚑
          </button>
        </div>
      {/each}
    </div>
  </div>
  {#if showMoveDialog}
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-base-300/80 backdrop-blur-sm"
    >
      <div class="bg-base-100 rounded-xl shadow-2xl w-full max-w-sm p-4 space-y-4">
        <h3 class="text-lg font-semibold text-base-content">Move to buoy</h3>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          {#if moveTargets.length}
            {#each moveTargets as buoy}
              <button
                type="button"
                class={`btn btn-sm btn-block justify-start ${
                  targetBuoyName === buoy ? "btn-primary" : "btn-ghost"
                }`}
                on:click={() => (targetBuoyName = buoy)}
              >
                {buoy}
              </button>
            {/each}
          {:else}
            <p class="text-sm text-base-content/70">
              No other buoys available.
            </p>
          {/if}
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            on:click={closeMoveDialog}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            disabled={!selectedReservation || !targetBuoyName}
            on:click={confirmMove}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <div class="flex justify-center">
    <span class="text-sm text-base-content/70">No members</span>
  </div>
{/if}
