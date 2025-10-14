<script lang="ts">
  export let boatCapacity: { name: string; totalDivers: number; isAssigned: boolean }[];
</script>

<div class="grid grid-cols-4 gap-1 text-sm font-medium">
  {#each boatCapacity as boat, index}
    <div class="flex items-center justify-center">
      <span class="bg-primary/10 text-primary px-2 py-1 rounded-md w-full text-center">
        {boat.name} - {boat.totalDivers}
      </span>
      {#if index < boatCapacity.length - 1}
        <span class="text-base-content/40 ml-1">|</span>
      {/if}
    </div>
  {/each}
</div>
