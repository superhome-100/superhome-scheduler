<script>
    import { dateStrInNDays } from '$lib/ReservationTimes.js';
    export let resType; /* past or upcoming */
    export let reservations;

    function deleteRsv(event) {
        let rexp = /(.+)_(.+)/
        let m = rexp.exec(event.target.id);
        let cat = m[1];
        let date = m[2];
        var i = reservations[cat].length;
        while (i--) {
            if (date === reservations[cat][i].date) {
                reservations[cat].splice(i,1);
                break;
            }
        }
        reservations = {...reservations};
    }
</script>

<table style="width: 100%">
    <thead>
        <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Status</th>
            {#if resType == 'upcoming'}
                <th>Cancel</th>
            {/if}
        </tr>
    </thead>
    <tbody>
        {#each Object.entries(reservations) as [cat, rsvs]}
            {#each rsvs as rsv}
                <tr>
                    <td>{rsv.date}</td>
                    <td>{cat}</td>
                    <td>{rsv.status}</td>
                    {#if resType == 'upcoming'}
                        <td>
                            <button 
                                id={`${cat}_${rsv.date}`} 
                                on:click={deleteRsv}
                            >X
                            </button>
                        </td>
                    {/if}
                </tr>
            {/each}
        {/each}
    </tbody>
</table>
