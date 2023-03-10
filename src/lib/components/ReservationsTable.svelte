<script>
    export let resType; /* past or upcoming */
    export let reservations;
    
    function modifyReservation(event) {

    }

    function deleteRsv(event) {
        let rexp = /(.+)_(.+)/
        let m = rexp.exec(event.target.id);
        let cat = m[1];
        let date = m[2];
        var i = reservations.length;
        while (i--) {
            if (date === reservations[i].dateStr
                && cat === reservations[i].category) {
                
                reservations.splice(i,1);
                break;
            }
        }
        reservations = [...reservations];
    }
</script>

<table id="myreservations_table">
    <thead>
        <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Details</th>
            <th>Status</th>
            {#if resType == 'upcoming'}
                <th>Modify</th>
                <th>Cancel</th>
            {/if}
        </tr>
    </thead>
    <tbody>
        {#each reservations as rsv, i}
            <tr>
                <td>{rsv.dateStr}</td>
                <td>{rsv.category}</td>
                <td>tbc</td>
                <td>{rsv.status}</td>
                {#if resType == 'upcoming'}
                    <td>
                        <button
                            id={`${rsv.category}_${rsv.dateStr}`}
                            on:click={modifyReservation}
                        >/
                        </button>
                    <td>
                        <button 
                            id={`${rsv.category}_${rsv.dateStr}`} 
                            on:click={deleteRsv}
                        >X
                        </button>
                    </td>
                {/if}
            </tr>
        {/each}
    </tbody>
</table>
