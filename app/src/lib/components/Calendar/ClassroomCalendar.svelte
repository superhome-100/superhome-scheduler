<script lang="ts">
  import dayjs from 'dayjs';
  export let timeSlots: string[];
  export let reservations: any[];
</script>

<div class="classroom-calendar">
  <div class="calendar-header">
    <div class="time-column-header">Time</div>
    {#each Array.from({ length: 3 }, (_, i) => i + 1) as room}
      <div class="room-header">Room {room}</div>
    {/each}
  </div>
  <div class="calendar-grid">
    {#each timeSlots as timeSlot}
      <div class="time-row">
        <div class="time-label">{timeSlot}</div>
        {#each Array.from({ length: 3 }, (_, i) => i + 1) as room}
          <div class="room-cell" data-room={room} data-time={timeSlot}>
            {#each reservations as reservation}
              {#if reservation.res_classroom &&
                  dayjs(reservation.res_classroom.start_time).format('HH:mm') === timeSlot &&
                  reservation.res_classroom.room === room.toString()}
                <div class="reservation-item classroom-reservation">
                  <div class="reservation-title">{reservation.user_profiles?.name || 'Unknown'}</div>
                  <div class="reservation-time">
                    {dayjs(reservation.res_classroom.start_time).format('HH:mm')} -
                    {dayjs(reservation.res_classroom.end_time).format('HH:mm')}
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
  .classroom-calendar {
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
  }

  .calendar-header {
    display: grid;
    grid-template-columns: 80px repeat(3, 1fr);
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
  }

  .time-column-header,
  .room-header {
    padding: 1rem 0.5rem;
    text-align: center;
    font-weight: 600;
    color: #475569;
    border-right: 1px solid #e2e8f0;
  }

  .room-header:last-child {
    border-right: none;
  }

  .calendar-grid {
    max-height: 60vh;
    overflow-y: auto;
  }

  .time-row {
    display: grid;
    grid-template-columns: 80px repeat(3, 1fr);
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

  .room-cell {
    padding: 0.25rem;
    border-right: 1px solid #e2e8f0;
    min-height: 60px;
    position: relative;
  }

  .room-cell:last-child {
    border-right: none;
  }

  .room-cell:hover {
    background: #f0f9ff;
  }

  .classroom-reservation {
    background: #fecaca;
    border-color: #ef4444;
  }
</style>
