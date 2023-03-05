<script>
    import { startTimes } from './ReservationTimes.js';
</script>

<table class="day">
    <tr>
        <th/>
        <th>Classroom 1</th>
        <th>Classroom 2</th>
        <th>Classroom 3</th>
    </tr>
    {#each startTimes as t}
        <tr>
            <th>{t}</th>
            {#each [...Array(3).keys()] as room}
                <td class="schedule_cell classroom"></td>
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

