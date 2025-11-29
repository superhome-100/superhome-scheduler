<script lang="ts">
  import BoatCapacityDisplay from "./BoatCapacityDisplay.svelte";
  import ResizableTableHeader from "./ResizableTableHeader.svelte";
  import ReservationTableRow from "./ReservationTableRow.svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";

  export let timePeriod: "AM" | "PM";
  export let boatCapacity: {
    name: string;
    totalDivers: number;
    isAssigned: boolean;
  }[];
  export let buoyGroups: AdminBuoyGroup[];
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let availableBoats: string[];
  export let loading: boolean;
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  export let onMouseDown: (event: MouseEvent, column: string) => void;
  // When true, rows render in read-only mode
  export let readOnly: boolean = false;

  $: filteredGroups = buoyGroups.filter((bg) => bg.time_period === timePeriod);
</script>

<div
  class="card bg-base-100 border border-base-300 rounded-lg reservation-card"
>
  <div class="card-body p-0">
    <h3
      class="card-title text-lg font-semibold text-base-content p-4 bg-base-200 border-b border-base-300 m-0 flex justify-between items-center"
    >
      <span>{timePeriod} Reservations</span>
      {#if !readOnly}
        <BoatCapacityDisplay {boatCapacity} />
      {/if}
    </h3>
    {#if loading}
      <div class="p-4 text-center text-base-content/70">
        Loading buoy assignments...
      </div>
    {:else}
      <div class="overflow-x-auto">
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
                {onUpdateBuoy}
                {onUpdateBoat}
                on:groupClick
                on:moveReservationToBuoy
                on:statusClick
              />
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
