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
        <th>buoy</th>
        {#each ['AM', 'PM'] as time}
            <th>{time}</th>
        {/each}
    </tr>
    {#each $buoys as buoy}
        {#if schedule.AM[buoy.name] != undefined || schedule.PM[buoy.name] != undefined}
            <tr>
                <th>{buoy.name}</th>
                {#each ['AM', 'PM'] as time}
                    <td>
                        {#if schedule[time][buoy.name] != undefined}
                            {#each schedule[time][buoy.name] as rsv}
                                <p>{displayTag(rsv)}</p>
                            {/each}
                        {/if}
                    </td>
                {/each}
            </tr>
        {/if}
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

