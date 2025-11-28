<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { getTypeDisplay } from "../../utils/reservationTransform";
  import dayjs from "dayjs";
  import AdminPendingFilters from './AdminPendingFilters.svelte';
  import type { Enums } from '$lib/database.types';

  const dispatch = createEventDispatcher();

  export let pendingReservations: any[] = [];
  export let stats: any = {};
  export let processingReservation: string | null = null;

  // Filter state
  type Category = 'all' | Enums<'reservation_type'>; // 'pool' | 'open_water' | 'classroom'
  let category: Category = 'all';
  let type: string = 'all';

  // Map category to field name in flattened reservation object
  const categoryFieldMap: Record<Exclude<Category,'all'>, string> = {
    pool: 'pool_type',
    open_water: 'open_water_type',
    classroom: 'classroom_type'
  } as const;

  // Compute available types based on selected category and current data
  $: availableTypes = (() => {
    if (category === 'all') return [] as string[];
    const field = categoryFieldMap[category];
    const values = new Set<string>();
    for (const r of pendingReservations) {
      if (r.res_type === category && r[field]) {
        values.add(String(r[field]));
      }
    }
    return Array.from(values).sort();
  })();

  // Filtered list based on current filters
  $: filteredReservations = (() => {
    return (pendingReservations || []).filter((r) => {
      if (category !== 'all' && r.res_type !== category) return false;
      if (category !== 'all' && type !== 'all') {
        const field = categoryFieldMap[category];
        return String(r[field] || '') === type;
      }
      return true;
    });
  })();

  const handleRefresh = () => {
    dispatch("refresh");
  };

  const handleReservationAction = (
    reservation: any,
    action: "approve" | "reject",
  ) => {
    dispatch("reservationAction", { reservation, action });
  };

  const openReservationDetails = (reservation: any) => {
    dispatch("openReservationDetails", reservation);
  };

  // Keyboard accessibility for clickable list items
  function handleItemKeydown(event: KeyboardEvent, reservation: any) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openReservationDetails(reservation);
    }
  }
</script>

<div
  class="card bg-base-100 shadow-sm border border-base-300 rounded-xl"
>
  <div class="flex flex-col gap-2 sm:flex-col">
    <h2 class="text-xl font-semibold text-[#00294C] flex items-center gap-2 px-3 sm:px-4">
      Pending
      <div
        class="badge badge-error font-bold text-sm md:text-base w-6 h-6 md:w-8 md:h-8 shadow ring-1 ring-white/90 border border-white/60 flex items-center justify-center rounded-full"
        aria-label="Pending reservations count"
        title="Pending reservations"
      >
        {stats.pendingReservations}
      </div>
    </h2>
    <div class="flex items-center justify-center gap-2 w-full px-3 sm:px-4 overflow-hidden">
      <!-- Filters inline before Refresh -->
      <AdminPendingFilters
        {category}
        {type}
        {availableTypes}
        on:change={(e) => { category = e.detail.category; type = e.detail.type; }}
      />
      <button
        class="btn btn-ghost btn-sm h-9 min-h-9 gap-1 text-[#00294C] hover:text-[#00294C] align-middle flex-shrink-0"
        on:click={handleRefresh}
        aria-label="Refresh"
        title="Refresh"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path
            d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
          />
        </svg>
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>
  </div>

  {#if filteredReservations.length > 0}
    <!-- Mobile compact list -->
    <div class="mt-3 space-y-2" class:max-h-80={filteredReservations.length > 5} class:overflow-y-auto={filteredReservations.length > 5}>
      {#each filteredReservations as reservation}
        <div
          class="flex items-center justify-between gap-3 min-h-[60px] rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary bg-base-100"
          role="button"
          tabindex="0"
          on:click={() => openReservationDetails(reservation)}
          on:keydown={(e) => handleItemKeydown(e as KeyboardEvent, reservation)}
        >
          <div class="flex flex-col gap-1 min-w-0 flex-1">
            <div class="font-semibold text-[#00294C] text-sm truncate">
              {reservation.user_profiles?.nickname ||
                reservation.user_profiles?.name ||
                "Unknown User"}
            </div>
            <div class="flex items-center gap-2 text-xs text-[#00294C]">
              <span
                class="badge badge-sm text-[#00294C]"
                class:badge-primary={reservation.res_type === "pool"}
                class:badge-success={reservation.res_type === "open_water"}
                class:badge-error={reservation.res_type === "classroom"}
              >
                {getTypeDisplay(reservation.res_type)}
              </span>
              <span>{dayjs(reservation.res_date).format("MMM D, YYYY")}</span>
            </div>
          </div>
          <!-- Action icon buttons; prevent propagation per button -->
          <div
            class="flex-shrink-0 flex items-center gap-2 md:gap-3"
            role="group"
            aria-label="Reservation actions"
          >
            <button
              class="inline-flex items-center justify-center h-6 px-2 rounded-md bg-[#dc3545] text-white text-[10px] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#dc3545] md:h-8 md:px-3 md:text-[12px]"
              on:click|stopPropagation={() =>
                handleReservationAction(reservation, "reject")}
              type="button"
              disabled={processingReservation ===
                `${reservation.uid}-${reservation.res_date}`}
              aria-busy={processingReservation ===
                `${reservation.uid}-${reservation.res_date}`}
              aria-label="Reject reservation"
              title="Reject"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="#ffffff"
                aria-hidden="true"
                class="w-3 h-3 md:w-4 md:h-4 text-white pointer-events-none shrink-0 block"
                style="color:#fff"
              >
                <path
                  d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  fill="#ffffff"
                />
              </svg>
            </button>
            <button
              class="inline-flex items-center justify-center h-6 px-2 rounded-md bg-[#28a745] text-white text-[10px] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#28a745] md:h-8 md:px-3 md:text-[12px]"
              on:click|stopPropagation={() =>
                handleReservationAction(reservation, "approve")}
              type="button"
              disabled={processingReservation ===
                `${reservation.uid}-${reservation.res_date}`}
              aria-busy={processingReservation ===
                `${reservation.uid}-${reservation.res_date}`}
              aria-label="Approve reservation"
              title="Approve"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="#ffffff"
                aria-hidden="true"
                class="w-3 h-3 text-white pointer-events-none shrink-0 block"
                style="color:#fff"
              >
                <path d="M9 16.17 4.83 12l-1.42 1.41L9 19l12-12-1.41-1.41z" fill="#ffffff" />
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>

  {:else}
    <div
      class="flex flex-col items-center justify-center text-[#00294C] text-center"
    >
      <svg
        viewBox="0 0 24 24"
        width="48"
        height="48"
        fill="currentColor"
        class="text-[#00294C] mb-4"
      >
        <path
          d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
        />
      </svg>
      <p class="text-sm text-[#00294C]">No pending reservation requests</p>
    </div>
  {/if}
</div>

