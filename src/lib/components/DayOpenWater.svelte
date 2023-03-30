<script>
    import { viewedDate, reservations, buoys } from '$lib/stores.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { displayTag } from '$lib/utils.js';
    import { assignRsvsToBuoys } from '$lib/autoAssign.js';

    
    function getOpenWaterSchedule(rsvs, datetime) {
        let schedule = {};
        let today = datetimeToLocalDateStr(datetime);
        rsvs = rsvs.filter((v) => v.category === 'openwater' && v.date === today);
        
        for (let owTime of ['AM', 'PM']) {
            let result = assignRsvsToBuoys(
                $buoys, 
                rsvs.filter((rsv) => rsv.owTime === owTime)
            ); 
            schedule[owTime] = result.assignments;
        }
        return schedule;
    }

    $: schedule = getOpenWaterSchedule($reservations, $viewedDate);

</script>

<table class="day">
    <tr>
        <th/>
        {#each $buoys as buoy}
            <th>{buoy.name} </th>
        {/each}
    </tr>
    {#each ['AM', 'PM'] as time}
        <tr>
            <th>{time}</th>
            {#each $buoys as buoy}
                <td>
                    {#if schedule[time][buoy.name] != undefined}
                        {#each schedule[time][buoy.name] as rsv}
                            <p>{displayTag(rsv)}</p>
                        {/each}
                    {/if}
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
        border:1px solid #00FF00;
    }
    td {
        vertical-align: top;
        text-align: center;
    }
</style>

