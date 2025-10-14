<script lang="ts">
  import BoatCapacityDisplay from './BoatCapacityDisplay.svelte';
  import ResizableTableHeader from './ResizableTableHeader.svelte';
  import ReservationTableRow from './ReservationTableRow.svelte';
  
  export let timePeriod: 'AM' | 'PM';
  export let boatCapacity: { name: string; totalDivers: number; isAssigned: boolean }[];
  export let buoyGroups: any[];
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let availableBoats: string[];
  export let loading: boolean;
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
  export let onMouseDown: (event: MouseEvent, column: string) => void;
  
  $: filteredGroups = buoyGroups.filter((bg) => bg.time_period === timePeriod);
</script>

<div class="card bg-base-100 shadow-sm border border-base-300 rounded-lg reservation-card">
  <div class="card-body p-0">
    <h3 class="card-title text-lg font-semibold text-base-content p-4 bg-base-200 border-b border-base-300 m-0 flex justify-between items-center">
      <span>{timePeriod} Reservations</span>
      <BoatCapacityDisplay {boatCapacity} />
    </h3>
    {#if loading}
      <div class="p-4 text-center text-base-content/70">Loading buoy assignments...</div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-fixed w-full">
          <thead>
            <tr class="bg-primary/10">
              <ResizableTableHeader columnType="buoy" {onMouseDown} />
              <ResizableTableHeader columnType="boat" {onMouseDown} />
              <ResizableTableHeader columnType="divers" {onMouseDown} />
            </tr>
          </thead>
          <tbody on:groupClick>
            {#each filteredGroups as buoyGroup}
              <ReservationTableRow 
                {buoyGroup} 
                {availableBuoys} 
                {availableBoats} 
                {onUpdateBuoy} 
                {onUpdateBoat}
                on:groupClick
              />
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
