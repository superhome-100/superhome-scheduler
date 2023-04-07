<script>
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { minuteOfDay, beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { timeStrToMin } from '$lib/datetimeUtils.js';
    import { user, reservations } from '$lib/stores.js';
    import Modal from './Modal.svelte';
    import Dialog from './Dialog.svelte';

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
    
    const chopYear = (dateStr) => {
        let re = /[0-9]+-0*(.+)/;
        let m = re.exec(dateStr);
        return m[1];
    };

</script>

{#if $user}
    <table class="m-auto">
        <thead>
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Status</th>
                {#if resType === 'upcoming'}
                    <th>View/Modify</th>
                    <th>Cancel</th>
                {:else if resType === 'past'}
                    <th>View</th>
                {/if}
            </tr>
        </thead>
        <tbody>
            {#each $reservations as rsv}
                {#if rsv.user.id === $user.id && getResType(rsv) === resType} 
                    <tr class="[&>td]:w-24">
                        <td>{chopYear(rsv.date)}</td>
                        <td>{rsv.category}</td>
                        <td>{rsv.status}</td>
                        <td>
                            <Modal>
                                <Dialog dialogType='modify' rsv={rsv}/>
                            </Modal>
                        </td>
                        <td>
                            {#if beforeCancelCutoff(rsv.date, rsv.startTime)}
                                <Modal>
                                    <Dialog dialogType='cancel' rsv={rsv}/>
                                </Modal>
                            {/if}
                        </td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
{/if}
