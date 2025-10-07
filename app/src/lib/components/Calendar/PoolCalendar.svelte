<script lang="ts">
  import dayjs from 'dayjs';
  export let timeSlots: string[];
  export let reservations: any[];
</script>

<div class="bg-white rounded-lg border border-base-300 overflow-hidden shadow-sm">
  <!-- Calendar Header -->
  <div class="grid grid-cols-[80px_repeat(8,1fr)] bg-base-200 border-b-2 border-base-300">
    <div class="p-4 px-2 text-center font-semibold text-base-content border-r border-base-300">
      Time
    </div>
    {#each Array.from({ length: 8 }, (_, i) => i + 1) as lane}
      <div class="p-4 px-2 text-center font-semibold text-base-content border-r border-base-300 last:border-r-0">
        Lane {lane}
      </div>
    {/each}
  </div>

  <!-- Calendar Grid -->
  <div class="max-h-[60vh] overflow-y-auto">
    {#each timeSlots as timeSlot}
      <div class="grid grid-cols-[80px_repeat(8,1fr)] border-b border-base-300 min-h-[60px]">
        <div class="p-2 text-center text-sm text-base-content/70 bg-base-200 border-r border-base-300 flex items-center justify-center">
          {timeSlot}
        </div>
        {#each Array.from({ length: 8 }, (_, i) => i + 1) as lane}
          <div 
            class="p-1 border-r border-base-300 last:border-r-0 min-h-[60px] relative hover:bg-info/10 transition-colors duration-200" 
            data-lane={lane} 
            data-time={timeSlot}
          >
            {#each reservations as reservation}
              {#if reservation.res_pool &&
                  dayjs(reservation.res_pool.start_time).format('HH:mm') === timeSlot &&
                  reservation.res_pool.lane === lane.toString()}
                <div class="badge badge-primary badge-lg w-full justify-start p-2 h-auto min-h-[2.5rem] text-xs">
                  <div class="flex flex-col items-start w-full">
                    <div class="font-medium truncate w-full">
                      {reservation.user_profiles?.name || 'Unknown'}
                    </div>
                    <div class="text-xs opacity-80">
                      {dayjs(reservation.res_pool.start_time).format('HH:mm')} -
                      {dayjs(reservation.res_pool.end_time).format('HH:mm')}
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
