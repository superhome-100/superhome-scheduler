<script lang="ts">
  export let boatCapacity: { name: string; totalDivers: number; isAssigned: boolean }[];
</script>

<div class="flex flex-row flex-nowrap items-center gap-2 text-xs font-medium whitespace-nowrap">
  {#each boatCapacity as boat, index}
    <span class="flex items-center gap-1">
      <span class="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
        {boat.name ? boat.name.replace(/^Boat\s+/, "B") : boat.name} - {boat.totalDivers}
      </span>
    </span>
  {/each}
</div>
