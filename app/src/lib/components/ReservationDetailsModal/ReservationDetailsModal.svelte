<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { formatDateTime } from "../../utils/dateUtils";
  import dayjs from "dayjs";
  import ReservationDetailsHeader from "./ResDetailsModal/ReservationDetailsHeader.svelte";
  import ReservationDetailsBody from "./ResDetailsModal/ReservationDetailsBody.svelte";
  import ReservationDetailsActions from "./ResDetailsModal/ReservationDetailsActions.svelte";
  import OpenWaterDetailsLoader from "./ResDetailsModal/OpenWaterDetailsLoader.svelte";
  import "./ResDetailsModal/ReservationDetailsStyles.css";
  import { getEditPhase, type EditPhase } from "../../utils/cutoffRules";
  import { reservationStore } from "../../stores/reservationStore";
  import ConfirmModal from "../ConfirmModal.svelte";
  import type { BuddyWithId } from "$lib/services/openWaterService";
  import {
    getBuddyGroupMembersForSlotWithIds,
    getBuddyNicknamesForReservation,
  } from "$lib/services/openWaterService";

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let reservation: any = null;
  export let isAdmin: boolean = false;
  export let currentUserId: string | undefined = undefined;
  // Optional callback prop for edit action (in addition to event dispatch)
  export let onEdit: (() => void) | null = null;

  const closeModal = () => {
    dispatch("close");
  };

  const emitUpdated = () => {
    dispatch("updated");
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  // Open Water detail state (loaded on demand)
  let owDepth: number | null = null;
  // Edit handled by parent via 'edit' event
  let confirmOpen = false;

  // Optional buddy cancellation options (for open water buddy groups)
  let buddyCancelOptions: BuddyWithId[] = [];
  let selectedBuddyIds: string[] = [];
  let loadingBuddyOptions = false;

  // Get display values for the reservation (unified structure)
  $: displayType =
    reservation?.type ||
    (reservation?.res_type === "pool"
      ? "Pool"
      : reservation?.res_type === "open_water"
        ? "Open Water"
        : reservation?.res_type === "classroom"
          ? "Classroom"
          : reservation?.res_type);

  $: displayStatus =
    reservation?.status || reservation?.res_status || "pending";

  $: displayDate = reservation?.date || reservation?.res_date;

  $: displayStartTime = reservation?.startTime || reservation?.start_time;
  $: displayEndTime = reservation?.endTime || reservation?.end_time;
  $: displayTimePeriod = reservation?.time_period;

  // Debug logging
  $: if (reservation) {
    console.log("ReservationDetailsModal: reservation data:", reservation);
    console.log("ReservationDetailsModal: displayDate:", displayDate);
    console.log("ReservationDetailsModal: displayStartTime:", displayStartTime);
    console.log("ReservationDetailsModal: displayEndTime:", displayEndTime);
    console.log(
      "ReservationDetailsModal: deep_fim_training:",
      reservation.deep_fim_training,
    );
    console.log("ReservationDetailsModal: pulley:", reservation.pulley);
    console.log(
      "ReservationDetailsModal: bottom_plate:",
      reservation.bottom_plate,
    );
    console.log("ReservationDetailsModal: large_buoy:", reservation.large_buoy);
  }

  $: displayNotes = reservation?.notes || reservation?.note;

  // Determine upcoming and permissions based on cutoff phases
  const getOriginalIso = () => reservation?.res_date as string | undefined;
  const getStartTime = () =>
    reservation?.start_time ||
    reservation?.res_pool?.start_time ||
    reservation?.res_classroom?.start_time ||
    "";
  const getTimeOfDay = () =>
    (reservation?.res_openwater?.time_period ||
      reservation?.time_period ||
      "AM") as "AM" | "PM";

  $: upcoming = (() => {
    if (!reservation?.res_date) return false;
    return new Date(reservation.res_date).getTime() > Date.now();
  })();

  $: editPhase = (() => {
    if (!reservation) return "before_mod_cutoff" as EditPhase;
    const t = reservation.res_type as "open_water" | "pool" | "classroom";
    const iso = getOriginalIso()!;
    if (t === "open_water")
      return getEditPhase(t, iso, undefined, getTimeOfDay());
    return getEditPhase(t, iso, getStartTime(), undefined);
  })();

  // Owner-only control: only the reservation owner can see Edit
  $: isOwner = (() => {
    if (!reservation || !currentUserId) return false;
    try {
      return String(reservation.uid) === String(currentUserId);
    } catch {
      return false;
    }
  })();

  $: canEdit = (() => {
    if (!reservation) return false;
    if (!isOwner) return false; // Gate to owner only
    if (!upcoming) return false;
    const status = String(
      reservation?.res_status || reservation?.status,
    ).toLowerCase();
    if (!["pending", "confirmed"].includes(status)) return false;
    // Allow edit in both phases except after cancel cutoff; modal will restrict fields when between mod and cancel
    return editPhase !== "after_cancel_cutoff";
  })();

  $: canCancel = (() => {
    if (!reservation) return false;
    if (!isOwner) return false; // Gate to owner only
    if (!upcoming) return false;
    // Only allow before cancel cutoff
    return editPhase !== "after_cancel_cutoff";
  })();

  const toggleBuddySelection = (uid: string, checked: boolean) => {
    if (!uid) return;
    if (checked) {
      if (!selectedBuddyIds.includes(uid)) {
        selectedBuddyIds = [...selectedBuddyIds, uid];
      }
    } else {
      selectedBuddyIds = selectedBuddyIds.filter((id) => id !== uid);
    }
  };

  async function loadBuddyCancelOptions() {
    buddyCancelOptions = [];
    selectedBuddyIds = [];
    if (!reservation) return;

    console.log(
      "[CancelBuddyDebug] Starting loadBuddyCancelOptions for reservation:",
      {
        uid: reservation?.uid,
        res_type: reservation?.res_type,
        res_date: reservation?.res_date || reservation?.date,
        displayType,
        time_period: (reservation as any)?.time_period,
        timeOfDay: (reservation as any)?.timeOfDay,
        ow_time_period: (reservation as any)?.res_openwater?.time_period,
        ow_type:
          (reservation as any)?.open_water_type ||
          (reservation as any)?.res_openwater?.open_water_type,
      },
    );

    const isOW =
      displayType === "Open Water" || reservation?.res_type === "open_water";
    const isPool = displayType === "Pool" || reservation?.res_type === "pool";

    const poolType =
      reservation?.pool_type ??
      reservation?.poolType ??
      reservation?.res_pool?.pool_type ??
      reservation?.res_pool?.poolType ??
      reservation?.raw_reservation?.pool_type ??
      reservation?.raw_reservation?.poolType ??
      reservation?.raw_reservation?.res_pool?.pool_type ??
      reservation?.raw_reservation?.res_pool?.poolType ??
      null;

    if (!isOW && !(isPool && poolType === "autonomous")) {
      console.log(
        "[CancelBuddyDebug] Not open water or pool autonomous, skipping buddy cancel options",
      );
      return;
    }

    const uid: string | undefined = reservation?.uid
      ? String(reservation.uid)
      : undefined;
    const dateStr: string | undefined =
      reservation?.res_date || reservation?.date;

    // Handle Open Water
    if (isOW) {
      const owType =
        (reservation as any)?.open_water_type ||
        (reservation as any)?.res_openwater?.open_water_type ||
        null;

      // For now, skip buddies for course/coaching, same as the details body
      if (owType === "course_coaching") {
        console.log(
          "[CancelBuddyDebug] open_water_type is course_coaching, skipping buddies",
        );
        return;
      }

      const timePeriod: "AM" | "PM" | undefined =
        (reservation as any)?.time_period ||
        (reservation as any)?.timeOfDay ||
        (reservation as any)?.res_openwater?.time_period;

      if (!uid || !dateStr || (timePeriod !== "AM" && timePeriod !== "PM")) {
        console.log(
          "[CancelBuddyDebug] Missing required slot keys for buddy lookup",
          {
            uid,
            dateStr,
            timePeriod,
          },
        );
        return;
      }

      loadingBuddyOptions = true;
      try {
        const buddies = await getBuddyGroupMembersForSlotWithIds(
          String(dateStr),
          timePeriod,
          "open_water",
          uid,
        );
        console.log("[CancelBuddyDebug] Buddy lookup result:", buddies);
        buddyCancelOptions = Array.isArray(buddies) ? buddies : [];
      } catch (e) {
        console.warn(
          "[ReservationDetailsModal] Failed to load buddy cancel options",
          e,
        );
        buddyCancelOptions = [];
      } finally {
        loadingBuddyOptions = false;
      }
      return;
    }

    // Handle Pool Autonomous
    if (isPool && poolType === "autonomous") {
      // Try specific reservation ID lookup first (most accurate for Pool +1s)
      if (reservation?.reservation_id) {
        loadingBuddyOptions = true;
        try {
          const buddies = await getBuddyNicknamesForReservation(
            Number(reservation.reservation_id),
          );
          // Filter out current user
          buddyCancelOptions = buddies.filter((b) => b.uid !== uid);
          console.log(
            "[CancelBuddyDebug] Pool buddy lookup result:",
            buddyCancelOptions,
          );
        } catch (e) {
          console.warn(
            "[ReservationDetailsModal] Failed to load pool buddy options",
            e,
          );
          buddyCancelOptions = [];
        } finally {
          loadingBuddyOptions = false;
        }
        return;
      }

      // Fallback: try time-slot based group lookup
      const start: string | null =
        reservation?.start_time ??
        reservation?.startTime ??
        reservation?.res_pool?.start_time ??
        reservation?.raw_reservation?.start_time ??
        reservation?.raw_reservation?.res_pool?.start_time ??
        null;

      if (!uid || !dateStr || !start) {
        console.log("[CancelBuddyDebug] Missing pool keys for buddy lookup");
        return;
      }

      let parsed = dayjs(start, ["HH:mm", "HH:mm:ss"], true);
      if (!parsed.isValid()) parsed = dayjs(start);
      if (!parsed.isValid()) return;

      const timePeriodPool: "AM" | "PM" = parsed.hour() < 12 ? "AM" : "PM";

      loadingBuddyOptions = true;
      try {
        const buddies = await getBuddyGroupMembersForSlotWithIds(
          String(dateStr),
          timePeriodPool,
          "pool",
          uid,
        );
        buddyCancelOptions = buddies;
      } catch (e) {
        buddyCancelOptions = [];
      } finally {
        loadingBuddyOptions = false;
      }
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    await loadBuddyCancelOptions();
    confirmOpen = true;
  }

  async function confirmCancel() {
    if (!reservation) return;
    const t = reservation.res_type as "open_water" | "pool" | "classroom";
    const start =
      reservation?.res_pool?.start_time ||
      reservation?.res_classroom?.start_time ||
      reservation?.start_time ||
      undefined;
    const period = (reservation?.res_openwater?.time_period ||
      reservation?.time_period) as "AM" | "PM" | undefined;

    const buddiesToCancel = buddyCancelOptions.length
      ? selectedBuddyIds.filter((id) =>
          buddyCancelOptions.some((b) => b.uid === id),
        )
      : [];

    const { success, error } = await reservationStore.cancelReservation(
      reservation.uid,
      reservation.res_date,
      {
        res_type: t,
        start_time: start,
        time_period: t === "open_water" ? period || "AM" : undefined,
      },
      buddiesToCancel,
    );

    if (success) {
      emitUpdated();
      closeModal();
    } else {
      console.error("Failed to cancel reservation:", error);
    }
  }

  // Compute display name for both admins and users
  const getDisplayName = (res: any): string => {
    if (!res) return "";
    const uid = res?.uid ? String(res.uid) : undefined;
    if (!isAdmin && currentUserId && uid && String(currentUserId) === uid)
      return "You";
    const nick = res?.user_profiles?.nickname;
    if (nick) return nick as string;
    const fullName = res?.user_profiles?.name;
    if (fullName) return fullName as string;
    // For non-admins, avoid leaking other identifiers; just show generic label
    return isAdmin ? "Unknown User" : "Member";
  };

  $: userName = getDisplayName(reservation);
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && reservation}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === "Escape" && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Reservation Details"
    tabindex="-1"
  >
    <div class="modal-content">
      <ReservationDetailsHeader
        {displayType}
        {displayStatus}
        {userName}
        on:close={closeModal}
      />

      <ReservationDetailsBody
        {reservation}
        {displayType}
        {displayDate}
        {displayNotes}
        {isAdmin}
        bind:owDepth
      />

      <ReservationDetailsActions
        {canEdit}
        {canCancel}
        on:edit={() => {
          if (typeof onEdit === "function") {
            console.log("ReservationDetailsModal: invoking onEdit prop");
            try {
              onEdit();
            } catch (e) {
              console.error("onEdit prop error:", e);
            }
          }
          console.log("ReservationDetailsModal: edit event dispatched");
          dispatch("edit");
        }}
        on:cancel={handleCancel}
        on:close={closeModal}
      />
    </div>
  </div>
{/if}

<!-- Cancel Confirmation Modal -->
<ConfirmModal
  bind:open={confirmOpen}
  title="Cancel reservation?"
  message="Are you sure you want to cancel this reservation? This action cannot be undone."
  confirmText="Yes, cancel"
  cancelText="No, keep it"
  on:confirm={confirmCancel}
  on:cancel={() => {
    /* noop, just close */
  }}
>
  {#if loadingBuddyOptions}
    <div class="flex items-center gap-2 pt-2">
      <span class="loading loading-spinner loading-xs" aria-hidden="true"
      ></span>
      <span class="text-xs text-slate-500">Loading buddies</span>
    </div>
  {:else if buddyCancelOptions.length > 0}
    <div class="pt-2">
      <div class="flex flex-col gap-1">
        {#each buddyCancelOptions as buddy}
          <label class="flex items-center gap-2 text-xs sm:text-sm">
            <input
              type="checkbox"
              class="checkbox checkbox-xs sm:checkbox-sm"
              checked={selectedBuddyIds.includes(buddy.uid)}
              on:change={(e) =>
                toggleBuddySelection(
                  buddy.uid,
                  (e.currentTarget as HTMLInputElement).checked,
                )}
            />
            <span>Also cancel {buddy.name}'s reservation.</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</ConfirmModal>
