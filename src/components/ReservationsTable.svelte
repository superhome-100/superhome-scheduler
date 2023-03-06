<script>
    import { dateStrInNDays } from '../libs/ReservationTimes.js';
    export let resType; /* past or upcoming */

    function dummyReservations(resType) {
        let rsvs = [];
        for (let i=0; i<5; i++) {
             if (resType === 'upcoming') {
                rsvs.push({
                    category: ['pool', 'classroom', 'openwater'][i%3],
                    date: dateStrInNDays(i),
                    status: ['pending', 'confirmed'][i%2]
                });
            } else if (resType === 'past') {
                rsvs.push({
                    category: ['pool', 'classroom', 'openwater'][i%3],
                    date: dateStrInNDays(-2-i),
                    status: ['completed', 'canceled'][i%2]
                });
            }
        }
        return rsvs;
    }
    
    let rsvs = dummyReservations(resType);

    function deleteRsv(event) {
        var i = rsvs.length;
        while (i--) {
            if (event.target.id === `${rsvs[i].category}_${rsvs[i].date}`) {
                rsvs.splice(i,1);
                break;
            }
        }
        rsvs = [...rsvs];
    }
</script>

<br/>
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
        {#each rsvs as rsv}
            <tr>
                <td>{rsv.date}</td>
                <td>{rsv.category}</td>
                <td>{rsv.status}</td>
                {#if resType == 'upcoming'}
                    <td>
                        <button 
                            id={`${rsv.category}_${rsv.date}`} 
                            on:click={deleteRsv}
                        >X
                        </button>
                    </td>
                {/if}
            </tr>
        {/each}
    </tbody>
</table>
