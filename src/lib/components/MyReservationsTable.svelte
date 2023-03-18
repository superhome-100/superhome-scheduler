<script>
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { minuteOfDay, beforeCutoff } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { user, reservations } from '$lib/stores.js';
    import Modal from './Modal.svelte';
    import CancelDialog from './CancelDialog.svelte';

    export let resType; /* past or upcoming */

    function getResType(rsv) {
        let view;
        let today = new Date();
        let minute = minuteOfDay(today);
        let todayStr = datetimeToLocalDateStr(today);
        if (rsv.date > todayStr) {
            view = 'upcoming';
        } else if (rsv.date < todayStr) {
            view = 'past'
        } else {
            let rsvMin;
            if (['pool', 'classroom'].includes(rsv.category)) {
                rsvMin = timeStrToMin(rsv.endTime);
            } else if (rsv.category === 'openwater') {
                if (rsv.owTime === 'AM') {
                    rsvMin = 11*60; // 11am end time
                } else if (rsv.owTime === 'PM') {
                    rsvMin = 16*60; // 4pm end time
                }
            }
            view = rsvMin >= minuteOfDay(today) ? 'upcoming' : 'past';
        }
        return view;
    }

    function modifyReservation(event) {

    }

</script>

{#if $user}
    <table id="myreservations_table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Details</th>
                <th>Status</th>
                {#if resType === 'upcoming'}
                    <th>Modify</th>
                    <th>Cancel</th>
                {/if}
            </tr>
        </thead>
        <tbody>
            {#each $reservations as rsv}
                {#if rsv.user.id === $user.id && getResType(rsv) === resType} 
                    <tr>
                        <td>{rsv.date}</td>
                        <td>{rsv.category}</td>
                        <td>tbc</td>
                        <td>{rsv.status}</td>
                        {#if beforeCutoff(rsv.date)}
                            <td>
                                <button
                                    id={`${rsv.category}_${rsv.date}`}
                                    on:click={modifyReservation}
                                >/
                                </button>
                            </td>
                            <td>
                                <Modal>
                                    <CancelDialog rsv={rsv}/>
                                </Modal>
                            </td>
                        {/if}
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
{/if}
