<script lang="ts">
  import dayjs from 'dayjs';
  export let timeSlots: string[];
  export let reservations: any[];
</script>

<div class="bg-white rounded-lg border border-base-300 overflow-hidden shadow-sm">
  <!-- Calendar Header -->
  <div class="grid grid-cols-4 bg-base-200 border-b-2 border-base-300">
    <div class="p-2 sm:p-4 text-center font-semibold text-base-content border-r border-base-300 text-xs sm:text-sm">
      Time
    </div>
    {#each Array.from({ length: 3 }, (_, i) => i + 1) as room}
      <div class="p-2 sm:p-4 text-center font-semibold text-base-content border-r border-base-300 last:border-r-0 text-xs sm:text-sm">
        Room {room}
      </div>
    {/each}
  </div>

  <!-- Calendar Grid -->
  <div class="max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
    {#each timeSlots as timeSlot}
      <div class="grid grid-cols-4 border-b border-base-300 min-h-[50px] sm:min-h-[60px] hover:bg-base-100 transition-colors">
        <!-- Time Label -->
        <div class="p-1 sm:p-2 text-center text-xs sm:text-sm text-base-content/70 bg-base-200 border-r border-base-300 flex items-center justify-center">
          {timeSlot}
        </div>
        
        <!-- Room Cells -->
        {#each Array.from({ length: 3 }, (_, i) => i + 1) as room}
          <div class="p-0.5 sm:p-1 border-r border-base-300 last:border-r-0 min-h-[50px] sm:min-h-[60px] relative hover:bg-info/10 transition-colors" 
               data-room={room} 
               data-time={timeSlot}>
            {#each reservations as reservation}
              {#if reservation.res_classroom &&
                  dayjs(reservation.res_classroom.start_time).format('HH:mm') === timeSlot &&
                  reservation.res_classroom.room === room.toString()}
                <div class="badge badge-error badge-sm sm:badge-lg w-full justify-start p-1 sm:p-2 text-xs">
                  <div class="flex flex-col items-start w-full">
                    <div class="font-medium truncate w-full text-xs sm:text-sm">
                      {reservation.user_profiles?.name || 'Unknown'}
                    </div>
                    <div class="text-xs opacity-80 hidden sm:block">
                      {dayjs(reservation.res_classroom.start_time).format('HH:mm')} -
                      {dayjs(reservation.res_classroom.end_time).format('HH:mm')}
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
