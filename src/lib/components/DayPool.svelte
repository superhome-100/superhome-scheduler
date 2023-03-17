<script>
    import { startTimes, validReservationDate } from '$lib/ReservationTimes.js';
    import { timeGE, timeLT, datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { viewedDate, reservations } from '$lib/stores.js';
    import { getDaySchedule } from '$lib/utils.js';

    const nLanes = 4;

    $: schedule = getDaySchedule(startTimes(), $reservations, $viewedDate, 'pool', nLanes);

</script>

<table class="day">
    <tr>
        <th/>
        {#each [...Array(nLanes).keys()] as lane}
            <th>Lane {lane+1}</th>
        {/each}
    </tr>
    {#each schedule as s}
        <tr>
            <th>{s.start}</th>
            {#each [...Array(nLanes).keys()] as lane}
                <td class="schedule_cell pool_lane" style="width: max-content">
                    {#each s.rsvs[lane] as msg}
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
        border:1px solid #0000FF;
    }
    td {
        vertical-align: top;
        text-align: center;
    }
</style>

