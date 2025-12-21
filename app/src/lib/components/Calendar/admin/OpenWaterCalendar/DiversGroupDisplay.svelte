<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { OpenWaterReservationView } from "../../../../types/reservationViews";
  import { getBuddyNicknamesForReservation } from "../../../../services/openWaterService";

  export let buoyGroup: AdminBuoyGroup;
  export let availableBuoys: { buoy_name: string; max_depth: number }[] = [];
  // When true, suppress any controls that would mutate state
  export let readOnly: boolean = false;

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
  // Debug logs removed to keep file compact and under 300 lines

  $: reservations = buoyGroup.reservations;

  function getReservationDisplayName(
    reservation: OpenWaterReservationView,
  ): string {
    const typeFromGroup = buoyGroup?.open_water_type ?? null;
    const typeFromReservation = reservation.open_water_type ?? null;
    const isCourse =
      (typeFromGroup && typeFromGroup.toLowerCase() === "course_coaching") ||
      (typeFromReservation &&
        typeFromReservation.toLowerCase() === "course_coaching");

    const rawNick = (reservation.nickname ?? "").trim();
    const rawName = (reservation.name ?? "").trim();
    const profileNick = (reservation as any)?.user_profiles?.nickname
      ? String((reservation as any).user_profiles.nickname).trim()
      : "";
    const profileName = (reservation as any)?.user_profiles?.name
      ? String((reservation as any).user_profiles.name).trim()
      : "";

    // Try direct values first
    let baseName = rawNick || rawName || profileNick || profileName || "";

    // Last-resort fallback for non-admin user view: attempt to pair the reservation.uid with
    // the buoyGroup's member_uids/member_names arrays (populated from public RPC) to resolve a name.
    if (!baseName) {
      const uids: string[] = Array.isArray((buoyGroup as any)?.member_uids)
        ? ((buoyGroup as any).member_uids as string[])
        : [];
      const names: (string | null)[] = Array.isArray(
        (buoyGroup as any)?.member_names,
      )
        ? ((buoyGroup as any).member_names as (string | null)[])
        : [];
      if (uids.length && names.length) {
        const idx = uids.indexOf(reservation.uid);
        if (idx >= 0) {
          const n = (names[idx] ?? "").toString().trim();
          if (n) baseName = n;
        }
      }
    }

    baseName = baseName || "Unknown";

    // Real reservations (admin path): use per-reservation student_count for +N
    const isSynthetic = reservation.reservation_id === -1;
    if (!isSynthetic && isCourse) {
      const n = reservation.student_count ?? 0;
      return n > 0 ? `${baseName} + ${n}` : baseName;
    }

    // For synthetic/non-admin rows, any "+N" logic should already be encoded
    // via nickname/name from the loader.
    return baseName;
  }

  // Decide per-reservation if the lock icon should be shown, derived only from
  // the reservation data itself (no reliance on array index ordering).
  function shouldShowLockIcon(reservation: OpenWaterReservationView): boolean {
    const hasBuoy = !!(
      reservation.buoy && String(reservation.buoy).trim() !== ""
    );
    if (!hasBuoy) return false;

    const type = (reservation.open_water_type ?? "").toLowerCase();

    // For course/coaching, show lock on rows that carry students (non-zero student_count)
    // which we treat as the instructor/lead reservation.
    if (type === "course_coaching") {
      const n = reservation.student_count ?? 0;
      return n > 0;
    }

    // For other types, any reservation with a non-empty buoy is considered locked.
    return true;
  }

  // Move-to-buoy dialog state
  let showMoveDialog = false;
  let selectedReservation: OpenWaterReservationView | null = null;
  let targetBuoyName: string | null = null;
  let selectedDisplayName: string | null = null;

  // Buddy group state for the selected reservation
  let buddyNames: string[] = [];
  let hasBuddyGroup = false;
  let loadingBuddies = false;

  // Combined display names for move dialog.
  // Primary source is buddyNames from the Edge Function (nicknames for the group).
  // If there are no buddyNames, fall back to the locally resolved selectedDisplayName.
  $: moveDialogNames = (() => {
    if (Array.isArray(buddyNames) && buddyNames.length) {
      return buddyNames
        .map((n) => String(n ?? "").trim())
        .filter((n) => n.length > 0);
    }

    const fallback = (selectedDisplayName ?? "").trim();
    return fallback ? [fallback] : [];
  })();

  // Debug log removed

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

  function handleStatusClickOnReservation(
    reservation: OpenWaterReservationView,
    displayName: string,
  ) {
    dispatch("statusClick", { reservation, displayName });
  }

  function formatReservationSummary(
    reservation: OpenWaterReservationView,
  ): string {
    const typeLabel = reservation.open_water_type || "--";

    const configs: string[] = [];
    if (reservation.pulley) configs.push("Pulley");
    if (reservation.deep_fim_training) configs.push("Deep FIM training");
    if (reservation.bottom_plate) configs.push("Bottom plate");
    if (reservation.large_buoy) configs.push("Large buoy");

    const configsLabel = configs.length ? configs.join(", ") : "None";

    if (readOnly) {
      // Non-admin view: hide depth information entirely
      return `Openwater Type: ${typeLabel}\nConfigs: ${configsLabel}`;
    }

    const depthLabel =
      typeof reservation.depth_m === "number" &&
      !Number.isNaN(reservation.depth_m)
        ? `${reservation.depth_m} m`
        : "--";

    return `Openwater Type: ${typeLabel}\nDepth: ${depthLabel}\nConfigs: ${configsLabel}`;
  }

  async function openMoveDialog(
    reservation: OpenWaterReservationView,
    displayName: string,
  ) {
    console.log("[DiversGroupDisplay] openMoveDialog called", {
      reservation,
      displayName,
    });
    selectedReservation = reservation;
    selectedDisplayName = displayName;
    targetBuoyName = null;
    showMoveDialog = true;

    // Reset buddy state
    buddyNames = [];
    hasBuddyGroup = false;

    if (!reservation?.reservation_id) return;

    try {
      loadingBuddies = true;

      const buddies = await getBuddyNicknamesForReservation(
        reservation.reservation_id,
      );
      console.log(
        "[DiversGroupDisplay] loaded buddy names (via Edge Function)",
        {
          reservationId: reservation.reservation_id,
          buddies,
        },
      );
      buddyNames = Array.isArray(buddies)
        ? buddies
            .map((b) => (b as any)?.name)
            .map((n) => String(n ?? "").trim())
            .filter((n) => n.length > 0)
        : [];
      hasBuddyGroup = buddyNames.length > 0;
    } catch (err) {
      console.error("Failed to load buddy group members for move dialog", err);
    } finally {
      loadingBuddies = false;
    }
  }

  function closeMoveDialog() {
    showMoveDialog = false;
    selectedReservation = null;
    targetBuoyName = null;
    selectedDisplayName = null;
  }

  function confirmMove() {
    if (!selectedReservation || !targetBuoyName) return;
    dispatch("moveReservationToBuoy", {
      reservation_id: selectedReservation.reservation_id,
      buoy_id: targetBuoyName,
      res_date: selectedReservation.res_date,
      time_period: buoyGroup.time_period,
    });
    closeMoveDialog();
  }
</script>

{#if reservations && reservations.length}
  <div
    class="relative hover:bg-base-200/50 transition-all duration-200 divers-group-box cursor-pointer"
    role="button"
    tabindex="0"
    aria-label="View group reservation details"
    on:click={handleGroupClick}
    on:keydown={handleKeyDown}
  >
    <!-- Debug removed -->
    <!-- Open Water Type Display Logic -->
    <div class="space-y-1 flex flex-col items-start w-full">
      {#each reservations as reservation, index}
        <div class="flex items-center gap-2 text-sm w-full">
          <div
            class={`res-status-marker w-2 h-2 rounded-full flex-shrink-0 ${getStatusColorClass(
              reservation?.res_status ?? null,
            )}`}
            on:click|stopPropagation={() => {
              if (!readOnly)
                handleStatusClickOnReservation(
                  reservation,
                  getReservationDisplayName(reservation, index),
                );
            }}
            role={readOnly ? undefined : "button"}
            aria-label={readOnly ? undefined : "Update reservation status"}
          ></div>
          <div class="flex items-center gap-1 flex-1 min-w-0">
            {#if shouldShowLockIcon(reservation)}
              <span
                class="text-primary flex-shrink-0"
                aria-label={reservation.buoy
                  ? `Locked to buoy ${reservation.buoy}`
                  : "Locked to buoy"}
                title={reservation.buoy
                  ? `Locked to buoy ${reservation.buoy}`
                  : "Locked to buoy"}
              >
                🔒
              </span>
            {/if}
            <div class="flex flex-col leading-tight min-w-0">
              <span class="font-medium text-gray-800 truncate">
                {#if !readOnly && typeof reservation.depth_m === "number" && !Number.isNaN(reservation.depth_m)}
                  {reservation.depth_m} m -
                {/if}
                {getReservationDisplayName(reservation, index)}
              </span>
              {#if reservation.open_water_type}
                <span class="text-[10px] text-gray-500 truncate">
                  {reservation.open_water_type}
                </span>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-1">
            {#if !readOnly}
              <button
                type="button"
                class="btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6 flex items-center justify-center"
                on:click|stopPropagation={() =>
                  openMoveDialog(
                    reservation,
                    getReservationDisplayName(reservation, index),
                  )}
                aria-label="Move to buoy"
              >
                ⚑
              </button>
            {/if}
            <div
              class="tooltip tooltip-left z-20"
              data-tip={formatReservationSummary(reservation)}
            >
              <button
                type="button"
                class="btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6 flex items-center justify-center"
                on:click|stopPropagation
                aria-label="View reservation details"
              >
                i
              </button>
            </div>
          </div>
        </div>
      {/each}
      {#if !readOnly && buoyGroup.admin_note}
        <div class="px-0.5">
          <p
            class="text-[10px] text-primary/80 italic font-medium leading-tight break-words"
          >
            "{buoyGroup.admin_note}"
          </p>
        </div>
      {/if}
    </div>
  </div>
  {#if showMoveDialog && !readOnly}
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-base-300/80 backdrop-blur-sm"
    >
      <div
        class="bg-base-100 rounded-xl shadow-2xl w-full max-w-sm p-4 space-y-4"
      >
        <h3 class="text-lg font-semibold text-base-content">Move to buoy</h3>
        {#if moveDialogNames.length}
          <div class="space-y-1">
            <p class="text-sm text-base-content/80">
              Move the following users to buoy:
            </p>
            <div class="flex flex-wrap gap-1">
              {#each moveDialogNames as name}
                <span class="badge badge-sm badge-primary">{name}</span>
              {/each}
            </div>
          </div>
        {/if}
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
