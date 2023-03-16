<script>
    import { viewedDate, reservations } from '$lib/stores.js';
    import { datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

    const buoys = ['A', 'B', 'C', 'D'];

    function getOpenWaterSchedule(rsvs, datetime) {
        let schedule = {
            'AM': Array(buoys.length).fill().map(() => []), 
            'PM': Array(buoys.length).fill().map(() => []), 
        };
        let today = datetimeToLocalDateStr(datetime);
        rsvs = rsvs.filter((v) => v.category === 'openwater' && v.date === today);

        let buoy = {'AM': 0, 'PM': 0}
        for (let rsv of rsvs) {
            rsv.buoy = buoy[rsv.owTime];
            schedule[rsv.owTime][rsv.buoy].push(rsv);
            buoy[rsv.owTime] = (buoy[rsv.owTime] + 1) % buoys.length;
        }
        return schedule;
    }

    $: schedule = getOpenWaterSchedule($reservations, $viewedDate);

</script>

<table class="day">
    <tr>
        <th/>
        {#each buoys as buoy}
            <th>Buoy {buoy}</th>
        {/each}
    </tr>
    <tr>
        <th>AM</th>
         {#each schedule.AM as rsvs}
             <td class="schedule_cell buoy">
                {#each rsvs as rsv}
                    {rsv.user.name}
                {/each}
             </td>
        {/each}
    </tr>
    <tr>
        <th>PM</th>
        {#each schedule.PM as rsvs}
            <td class="schedule_cell buoy">
                {#each rsvs as rsv}
                    {rsv.user.name}
                {/each}
            </td>
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

