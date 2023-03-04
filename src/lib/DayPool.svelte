<script>
    import { startTimes } from './ReservationTimes.js';
</script>

<table style="width: 100vh; height: 100vh">
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
            <td/>
            <td/>
            <td/>
            <td/>
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

