<script>
    import { startTimes } from './ReservationTimes.js';
</script>

<table class="day">
    <tr>
        <th/>
        <th>Lane 1</th>
        <th>Lane 2</th>
        <th>Lane 3</th>
        <th>Lane 4</th>
    </tr>
    {#each startTimes as t}
        <tr>
            <th>{t}</th>
            {#each [...Array(4).keys()] as lane}
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

