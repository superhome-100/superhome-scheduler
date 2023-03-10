<script>
    import { startTimes } from '$lib/ReservationTimes.js';
    let nLanes = 4;
</script>

<table class="day">
    <tr>
        <th/>
        {#each [...Array(nLanes).keys()] as lane}
            <th>Lane {lane+1}</th>
        {/each}
    </tr>
    {#each startTimes as t}
        <tr>
            <th>{t}</th>
            {#each [...Array(nLanes).keys()] as lane}
                <td class="schedule_cell pool_lane"></td>
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

