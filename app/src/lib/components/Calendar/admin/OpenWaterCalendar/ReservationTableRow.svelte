<script lang="ts">
  import DiversGroupDisplay from './DiversGroupDisplay.svelte';
  
  export let buoyGroup: any;
  export let availableBuoys: { buoy_name: string; max_depth: number }[];
  export let availableBoats: string[];
  export let onUpdateBuoy: (groupId: number, buoyName: string) => void;
  export let onUpdateBoat: (groupId: number, boatName: string) => void;
</script>

<tr class="hover:bg-base-100">
  <td class="p-2 pr-3">
    <div class="flex items-center justify-center w-full min-h-10">
      <select
        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        bind:value={buoyGroup.buoy_name}
        on:change={() => onUpdateBuoy(buoyGroup.id, buoyGroup.buoy_name)}
      >
        {#each availableBuoys as b}
          <option value={b.buoy_name}>{b.buoy_name} (≤{b.max_depth}m)</option>
        {/each}
      </select>
    </div>
  </td>
  <td class="p-2 px-3">
    <div class="flex items-center justify-center w-full min-h-10">
      <select
        class="select select-bordered w-full bg-white rounded-lg border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
        bind:value={buoyGroup.boat}
        on:change={() => onUpdateBoat(buoyGroup.id, buoyGroup.boat)}
      >
        <option value="">Select Boat</option>
        {#each availableBoats as boat}
          <option value={boat}>{boat}</option>
        {/each}
      </select>
    </div>
  </td>
  <td class="p-2 pl-3">
    <DiversGroupDisplay {buoyGroup} on:groupClick />
  </td>
</tr>
