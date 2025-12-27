<script lang="ts">
  import { createEventDispatcher } from "svelte";
  // date formatting handled inside ReservationCard
  import ReservationCard from "../ReservationCard/ReservationCard.svelte";
  import LoadingSpinner from "../LoadingSpinner.svelte";
  import GroupedCompletedList from "../ReservationTotals/GroupedCompletedList.svelte";
  import ConfirmModal from "../ConfirmModal.svelte";
  import { reservationStore } from "../../stores/reservationStore";
  import type { BuddyWithId } from "$lib/services/openWaterService";
  import {
    getBuddyGroupMembersForSlotWithIds,
    getBuddyNicknamesForReservation,
  } from "$lib/services/openWaterService";
  import { checkCancellationAvailability } from "../../utils/reservationCancelUtils";
  import ErrorModal from "../ErrorModal.svelte";
  import dayjs from "dayjs";

  const dispatch = createEventDispatcher();

  export let upcomingReservations: any[] = [];
  export let completedReservations: any[] = [];
  export let monthlyTotals: Record<string, number> = {};
  export let activeMobileTab: "upcoming" | "completed" = "upcoming";
  export let showMobileViewAll = false;
  export let upcomingListEl: HTMLDivElement | null = null;
  export let completedListEl: HTMLDivElement | null = null;
  export let loading = false;
  export let error: string | null = null;

  const handleTabChange = (tab: "upcoming" | "completed") => {
    dispatch("tabChange", tab);
  };

  const handleViewAll = () => {
    dispatch("viewAll");
  };

  const handleReservationClick = (reservation: any) => {
    dispatch("reservationClick", reservation);
  };

  const handleNewReservation = () => {
    dispatch("newReservation");
  };

  // Cancel confirmation state
  let confirmOpen = false;
  let reservationToCancel: any = null;
  let cancelErrorOpen = false;
  let cancelErrorMessage =
    "Unable to cancel. The cancellation cutoff time has already passed.";

  // Buddy cancellation options for upcoming list cancel (mobile)
  let buddyCancelOptions: BuddyWithId[] = [];
  let selectedBuddyIds: string[] = [];
  let loadingBuddyOptions = false;

  const toggleBuddySelection = (uid: string, checked: boolean) => {
    if (!uid) return;
    if (checked) {
      if (!selectedBuddyIds.includes(uid))
        selectedBuddyIds = [...selectedBuddyIds, uid];
    } else {
      selectedBuddyIds = selectedBuddyIds.filter((id) => id !== uid);
    }
  };

  async function loadBuddyCancelOptionsFor(reservation: any) {
    buddyCancelOptions = [];
    selectedBuddyIds = [];
    if (!reservation) return;

    const displayType =
      reservation.type ||
      (reservation.res_type === "open_water"
        ? "Open Water"
        : reservation.res_type);
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

    if (!isOW && !(isPool && poolType === "autonomous")) return;

    // Handle Open Water
    if (isOW) {
      const owType =
        (reservation as any)?.open_water_type ||
        (reservation as any)?.res_openwater?.open_water_type ||
        null;
      if (owType === "course_coaching") return;

      const uid: string | undefined = reservation?.uid
        ? String(reservation.uid)
        : undefined;
      const dateStr: string | undefined =
        reservation?.res_date || reservation?.date;
      const timePeriod: "AM" | "PM" | undefined =
        (reservation as any)?.time_period ||
        (reservation as any)?.timeOfDay ||
        (reservation as any)?.res_openwater?.time_period;

      if (!uid || !dateStr || (timePeriod !== "AM" && timePeriod !== "PM"))
        return;

      loadingBuddyOptions = true;
      try {
        const buddies = await getBuddyGroupMembersForSlotWithIds(
          String(dateStr),
          timePeriod,
          "open_water",
          uid,
        );
        buddyCancelOptions = Array.isArray(buddies) ? buddies : [];
      } catch (e) {
        console.warn(
          "[MobileReservations] Failed to load buddy cancel options",
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
      const uid: string | undefined = reservation?.uid
        ? String(reservation.uid)
        : undefined;
      // Try specific reservation ID lookup first
      if (reservation?.reservation_id) {
        loadingBuddyOptions = true;
        try {
          const buddies = await getBuddyNicknamesForReservation(
            Number(reservation.reservation_id),
          );
          buddyCancelOptions = buddies.filter((b) => b.uid !== uid);
        } catch (e) {
          console.warn(
            "[MobileReservations] Failed to load pool buddy options",
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
      const dateStr: string | undefined =
        reservation?.res_date || reservation?.date;

      if (!uid || !dateStr || !start) return;

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

  const handleCancelRequest = async (reservation: any) => {
    if (!reservation) return;

    // Use centralized cancellation check
    const { canCancel, message } = checkCancellationAvailability(reservation);
    if (!canCancel) {
      if (message) cancelErrorMessage = message;
      cancelErrorOpen = true;
      return;
    }

    reservationToCancel = reservation;
    await loadBuddyCancelOptionsFor(reservation);
    confirmOpen = true;
  };

  const confirmCancel = async () => {
    try {
      const r = reservationToCancel;
      confirmOpen = false;
      if (!r) return;
      const t = (r.res_type ||
        (r.type === "Open Water"
          ? "open_water"
          : r.type === "Pool"
            ? "pool"
            : r.type === "Classroom"
              ? "classroom"
              : r.res_type)) as "open_water" | "pool" | "classroom";
      const start =
        r?.res_pool?.start_time ||
        r?.res_classroom?.start_time ||
        r?.start_time ||
        undefined;
      const period = (r?.res_openwater?.time_period || r?.time_period) as
        | "AM"
        | "PM"
        | undefined;

      const buddiesToCancel = buddyCancelOptions.length
        ? selectedBuddyIds.filter((id) =>
            buddyCancelOptions.some((b) => b.uid === id),
          )
        : [];

      const { success } = await reservationStore.cancelReservation(
        r.uid,
        r.res_date,
        {
          res_type: t,
          start_time: start,
          time_period: t === "open_water" ? period || "AM" : undefined,
        },
        buddiesToCancel,
      );
      if (success) {
        dispatch("computeOverflow");
        dispatch("retry");
      }
    } catch (e) {
      console.error("MobileReservations: cancel failed", e);
    } finally {
      reservationToCancel = null;
    }
  };
</script>

<!-- Mobile: Tabs container with Upcoming/Completed; View All appears at bottom only when list overflows -->
<div class="mobile-reservations">
  <div class="reservation-section">
    <div class="tabs-row">
      <button
        class="tab-btn"
        class:active={activeMobileTab === "upcoming"}
        on:click={() => handleTabChange("upcoming")}
        aria-pressed={activeMobileTab === "upcoming"}
      >
        <span>Upcoming</span>
        <span class="indicator" class:active={activeMobileTab === "upcoming"}
        ></span>
      </button>
      <button
        class="tab-btn"
        class:active={activeMobileTab === "completed"}
        on:click={() => handleTabChange("completed")}
        aria-pressed={activeMobileTab === "completed"}
      >
        <span>Completed</span>
        <span class="indicator" class:active={activeMobileTab === "completed"}
        ></span>
      </button>
    </div>

    <div class="reservation-content">
      {#if loading}
        <div class="loading-state">
          <LoadingSpinner size="md" />
          <p>Loading reservations...</p>
        </div>
      {:else if error}
        <div class="error-state">
          <p>Error: {error}</p>
          <button on:click={() => dispatch("retry")}>Retry</button>
        </div>
      {:else if activeMobileTab === "upcoming"}
        {#if upcomingReservations.length > 0}
          <div
            class="reservation-list compact mobile-scroll"
            bind:this={upcomingListEl}
            on:scroll={() => dispatch("computeOverflow")}
          >
            {#each upcomingReservations as reservation}
              <div class="flex items-stretch justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <ReservationCard
                    {reservation}
                    showPrice={false}
                    on:click={() => handleReservationClick(reservation)}
                    on:cancel={() => handleCancelRequest(reservation)}
                  />
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <svg
              class="empty-icon"
              viewBox="0 0 24 24"
              width="48"
              height="48"
              fill="currentColor"
            >
              <path
                d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
              />
            </svg>
            <p class="empty-text">No upcoming reservations</p>
            <button class="create-first-btn" on:click={handleNewReservation}
              >Create your first reservation</button
            >
          </div>
        {/if}
      {:else if completedReservations.length > 0}
        <div
          class="reservation-list compact mobile-scroll"
          bind:this={completedListEl}
          on:scroll={() => dispatch("computeOverflow")}
        >
          <GroupedCompletedList
            reservations={completedReservations}
            {monthlyTotals}
            on:reservationClick={(e) => handleReservationClick(e.detail)}
          />
        </div>
      {:else}
        <div class="empty-state">
          <svg
            class="empty-icon"
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="currentColor"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          <p class="empty-text">No completed reservations</p>
        </div>
      {/if}
    </div>

    {#if showMobileViewAll}
      <div class="mobile-view-all">
        <button
          class="refresh-btn"
          on:click={handleViewAll}
          aria-label="View all"
        >
          View All
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- Cancel Confirmation Modal -->
<ConfirmModal
  bind:open={confirmOpen}
  title="Cancel reservation?"
  message="Are you sure you want to cancel this reservation? This action cannot be undone."
  confirmText="Yes, cancel"
  cancelText="No, keep it"
  on:confirm={confirmCancel}
  on:cancel={() => {
    /* noop */
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

<ErrorModal
  bind:open={cancelErrorOpen}
  title="Cancellation Failed"
  message={cancelErrorMessage}
/>

<style>
  .mobile-reservations {
    display: none; /* Hidden by default, shown on mobile */
  }

  .reservation-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .tabs-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #0f172a;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #fff;
  }

  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    background: #cbd5e1;
  }
  .indicator.active {
    background: #22c55e;
  }

  .reservation-content {
    padding: 1rem;
  }

  .mobile-scroll {
    max-height: calc(70vh - 180px);
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .mobile-view-all {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem 1rem 1rem;
    background: white;
    border-top: 1px solid #e2e8f0;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    background: #e2e8f0;
    color: #1e293b;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
  }

  .empty-icon {
    color: #cbd5e1;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .create-first-btn {
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .create-first-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #64748b;
    gap: 0.5rem;
  }

  .loading-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 150px;
    color: #e53e3e;
    gap: 0.5rem;
  }

  .error-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .error-state button {
    background: #3b82f6;
    color: hsl(var(--bc));
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .mobile-reservations {
      display: block;
    }
  }
</style>
