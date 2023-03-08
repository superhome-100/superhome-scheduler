<table class="day">
    <tr>
        <th/>
        <th>Buoy A</th>
        <th>Buoy B</th>
        <th>Buoy C</th>
        <th>Buoy D</th>
    </tr>
    <tr>
        <th>AM</th>
         {#each [...Array(4).keys()] as buoy}
            <td class="schedule_cell buoy"></td>
        {/each}
    </tr>
    <tr>
        <th>PM</th>
        {#each [...Array(4).keys()] as buoy}
            <td class="schedule_cell buoy"></td>
        {/each}
   </tr>
</table>
<style type="text/css" media="screen">
    table {
        border-collapse:collapse;
    }
    table td {
        border:1px solid #00FF00;
    }
    td {
        vertical-align: top;
        text-align: center;
    }
</style>

