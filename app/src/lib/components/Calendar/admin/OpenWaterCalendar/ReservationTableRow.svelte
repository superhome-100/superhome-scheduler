<script lang="ts">
  import DiversGroupDisplay from "./DiversGroupDisplay.svelte";
  import type { AdminBuoyGroup } from "../../../../types/openWaterAdmin";

  export let buoyGroup: AdminBuoyGroup;
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let availableBoats: string[];
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  // When true, render controls as disabled
  export let readOnly: boolean = false;

  // Find the max depth for the currently selected buoy
  $: selectedBuoy = availableBuoys.find(
    (b) => b.buoy_name === buoyGroup.buoy_name
  );
  $: displayText = selectedBuoy
    ? `${selectedBuoy.buoy_name} (≤${selectedBuoy.max_depth}m)`
    : "Select";
</script>

<div
  class="flex hover:bg-base-100 border-b border-base-200 last:border-b-0"
  role="row"
>
  <div
    class="p-2 pr-3 w-20 flex-shrink-0 border-r border-base-300"
    role="gridcell"
    data-column="buoy"
  >
    <div class="flex items-center justify-center w-full min-h-10 relative">
      <select
        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 opacity-0 absolute inset-0"
        bind:value={buoyGroup.buoy_name}
        on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
        disabled={readOnly}
      >
        {#each availableBuoys as b}
          <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
        {/each}
      </select>
      <div class="text-sm font-medium pointer-events-none">
        {displayText}
      </div>
    </div>
  </div>
  <div
    class="p-2 px-3 w-20 flex-shrink-0 border-r border-base-300"
    role="gridcell"
    data-column="boat"
  >
    <div class="flex items-center justify-center w-full min-h-10">
      {#if readOnly}
        <span class="text-sm font-medium">
          {buoyGroup.boat && buoyGroup.boat.trim() !== "" ? buoyGroup.boat : "Not assigned"}
        </span>
      {:else}
        <select
          class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          bind:value={buoyGroup.boat}
          on:change={() => onUpdateBoat(buoyGroup.id, buoyGroup.boat)}
          disabled={readOnly}
        >
          <option value="">Select</option>
          {#each availableBoats as boat}
            <option value={boat}>{boat.replace("Boat ", "")}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>
  <div class="p-2 pl-3 flex-grow min-w-48" role="gridcell" data-column="divers">
    <section class="p-1">
      <DiversGroupDisplay
        {buoyGroup}
        {availableBuoys}
        {readOnly}
        on:groupClick
        on:moveReservationToBuoy
      />
    </section>
  </div>
</div>
