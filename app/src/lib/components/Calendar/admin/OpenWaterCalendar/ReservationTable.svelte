<script lang="ts">
  import BoatCapacityDisplay from "./BoatCapacityDisplay.svelte";
  import ResizableTableHeader from "./ResizableTableHeader.svelte";
  import ReservationTableRow from "./ReservationTableRow.svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";
  import type { Buoy } from "../../../../services/openWaterService";

  export let timePeriod: "AM" | "PM";
  export let boatCapacity: {
    name: string;
    totalDivers: number;
    isAssigned: boolean;
  }[];
  export let buoyGroups: AdminBuoyGroup[];
  export let availableBuoys: Buoy[];
  export let availableBoats: string[];
  export let loading: boolean;
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  export let onMouseDown: (event: MouseEvent, column: string) => void;
  // When true, rows render in read-only mode
  export let readOnly: boolean = false;
  export let currentUserId: string | undefined = undefined;
  export let onAutoAssign: (timePeriod: "AM" | "PM") => void = () => {};
  export let onLock: (timePeriod: "AM" | "PM") => void = () => {};
  export let onUnlock: (timePeriod: "AM" | "PM") => void = () => {};
  export let onUpdateNote: (
    groupId: number,
    note: string | null,
  ) => void = () => {};
  export let isFull: boolean = false;
  export let onToggleFull: (timePeriod: "AM" | "PM") => void = () => {};

  $: filteredGroups = buoyGroups.filter((bg) => bg.time_period === timePeriod);
</script>

<div
  class="card bg-base-100 border border-base-300 rounded-lg reservation-card"
>
  <div class="card-body p-0">
    <h3
      class="text-lg font-semibold text-base-content p-4 bg-base-200 border-b border-base-300 m-0 flex flex-row items-center gap-2"
    >
      <span class="truncate">{timePeriod}</span>

      {#if !readOnly}
        <div class="ml-auto flex flex-row flex-nowrap items-center gap-2">
          <BoatCapacityDisplay {boatCapacity} />
          <button
            type="button"
            class="btn {isFull
              ? 'btn-error'
              : 'btn-ghost'} btn-xs flex items-center gap-1"
            on:click={() => onToggleFull(timePeriod)}
            aria-label="Mark {timePeriod} as {isFull ? 'Available' : 'Full'}"
            disabled={loading}
          >
            {#if isFull}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="w-4 h-4"
                fill="currentColor"
              >
                <path
                  d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"
                />
              </svg>
              <span>Full</span>
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="w-4 h-4"
                fill="currentColor"
              >
                <path
                  d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H8.9V6zM18 20H6V10h12v10z"
                />
              </svg>
              <span>Mark Full</span>
            {/if}
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs flex items-center gap-1"
            on:click={() => onAutoAssign(timePeriod)}
            aria-label="Auto-assign buoys and refresh"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-xs"></span>
            {/if}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.9 9.06 1 1 0 0 0-2-.24A6 6 0 1 1 12 6a5.94 5.94 0 0 1 4.24 1.76L14 10h6V4z"
              />
            </svg>
            <span class="sr-only">Refresh</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs flex items-center justify-center"
            on:click={() => onLock(timePeriod)}
            aria-label="Lock assignments"
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4Zm7 11H7v-7h10Z"
              />
            </svg>
            <span class="sr-only">Lock</span>
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs flex items-center justify-center"
            on:click={() => onUnlock(timePeriod)}
            aria-label="Unlock assignments"
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M17 9h-1.18A3 3 0 0 0 10 7a1 1 0 0 0-2 0 5 5 0 0 1 9.9 1H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h10Zm-10 2v7h10v-7Z"
              />
            </svg>
            <span class="sr-only">Unlock</span>
          </button>
        </div>
      {/if}
    </h3>
    {#if loading}
      <div class="p-4 text-center text-base-content/70">
        Loading buoy assignments...
      </div>
    {:else}
      <div class="flex flex-col w-full min-w-max" role="table">
        <div
          class="flex bg-primary/10 border-b border-base-300"
          role="rowgroup"
        >
          <ResizableTableHeader columnType="buoy" {onMouseDown} />
          <ResizableTableHeader columnType="boat" {onMouseDown} />
          <ResizableTableHeader columnType="divers" {onMouseDown} />
        </div>
        <div class="flex flex-col" role="rowgroup">
          {#each filteredGroups as buoyGroup}
            <ReservationTableRow
              {buoyGroup}
              {availableBuoys}
              {availableBoats}
              {readOnly}
              {currentUserId}
              {onUpdateBuoy}
              {onUpdateBoat}
              {onUpdateNote}
              on:groupClick
              on:moveReservationToBuoy
              on:statusClick
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
