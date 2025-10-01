<script lang="ts">
  import dayjs from 'dayjs';
  export let timeSlots: string[];
  export let reservations: any[];
</script>

<div class="pool-calendar">
  <div class="calendar-header">
    <div class="time-column-header">Time</div>
    {#each Array.from({ length: 8 }, (_, i) => i + 1) as lane}
      <div class="lane-header">Lane {lane}</div>
    {/each}
  </div>
  <div class="calendar-grid">
    {#each timeSlots as timeSlot}
      <div class="time-row">
        <div class="time-label">{timeSlot}</div>
        {#each Array.from({ length: 8 }, (_, i) => i + 1) as lane}
          <div class="lane-cell" data-lane={lane} data-time={timeSlot}>
            {#each reservations as reservation}
              {#if reservation.res_pool &&
                  dayjs(reservation.res_pool.start_time).format('HH:mm') === timeSlot &&
                  reservation.res_pool.lane === lane.toString()}
                <div class="reservation-item pool-reservation">
                  <div class="reservation-title">{reservation.user_profiles?.name || 'Unknown'}</div>
                  <div class="reservation-time">
                    {dayjs(reservation.res_pool.start_time).format('HH:mm')} -
                    {dayjs(reservation.res_pool.end_time).format('HH:mm')}
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


<style>
  .pool-calendar {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .calendar-header {
    display: grid;
    grid-template-columns: 80px repeat(8, 1fr);
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
  }

  .time-column-header,
  .lane-header {
    padding: 1rem 0.5rem;
    text-align: center;
    font-weight: 600;
    color: #475569;
    border-right: 1px solid #e2e8f0;
  }

  .lane-header:last-child {
    border-right: none;
  }

  .calendar-grid {
    max-height: 60vh;
    overflow-y: auto;
  }

  .time-row {
    display: grid;
    grid-template-columns: 80px repeat(8, 1fr);
    border-bottom: 1px solid #e2e8f0;
    min-height: 60px;
  }

  .time-label {
    padding: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: #64748b;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lane-cell {
    padding: 0.25rem;
    border-right: 1px solid #e2e8f0;
    min-height: 60px;
    position: relative;
  }

  .lane-cell:last-child {
    border-right: none;
  }

  .lane-cell:hover {
    background: #f0f9ff;
  }

  .pool-reservation {
    background: #dbeafe;
    border-color: #3b82f6;
  }
</style>
