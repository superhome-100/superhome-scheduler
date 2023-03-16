<script>
    import { startTimes } from '$lib/ReservationTimes.js';
    import { reservations, viewedDate } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';
    
    const nRooms = 3;
    $: schedule = getDaySchedule(startTimes, $reservations, $viewedDate, 'classroom', nRooms);

</script>

<table class="day">
    <tr>
        <th/>
        {#each [...Array(nRooms).keys()] as room}
            <th>Room {room+1}</th>
        {/each}
    </tr>
    {#each schedule as s}
        <tr>
            <th>{s.start}</th>
            {#each [...Array(nRooms).keys()] as room}
                <td class="schedule_cell classroom">
                    {#each s.rsvs[room] as msg}
                        {msg}
                    {/each}
                </td>
            {/each}
        </tr>
    {/each}
</table>

<style type="text/css" media="screen">
    table {
        border-collapse:collapse;
    }
    table td {
        border:1px solid #FFFF00;
    }
    td {
        vertical-align: top;
        text-align: center;
    }
</style>

