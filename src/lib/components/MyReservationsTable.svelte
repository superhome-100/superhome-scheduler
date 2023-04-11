<script>
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { minuteOfDay, beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { timeStrToMin, idx2month } from '$lib/datetimeUtils.js';
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
    
    const shortDate = (dateStr) => {
        let re = /[0-9]+-([0-9]+)-[0]*([0-9]+)/;
        let m = re.exec(dateStr);
        let shortM = idx2month[parseInt(m[1])-1].slice(0,3);
        return m[2] + ' ' + shortM;
    };

    const bgColorFrom = 
        (category) => category === 'pool' 
            ? 'from-pool-bg-from' 
            : (category === 'openwater') 
                ? 'from-openwater-bg-from' 
                : (category === 'classroom') 
                    ? 'from-classroom-bg-from' 
                    : undefined;

    const bgColorTo = 
        (category) => category === 'pool' 
            ? 'to-pool-bg-to' 
            : (category === 'openwater') 
                ? 'to-openwater-bg-to' 
                : (category === 'classroom') 
                    ? 'to-classroom-bg-to' 
                    : undefined;

    const catDesc = (rsv) => {
        let desc = [rsv.categoryPretty]; 
        if (rsv.resType === 'course') {
            desc += ' +' + rsv.numStudents;
        }
        return desc;
    };

    const timeDesc = (rsv) => {
        const fmt = (time) => {
            let rx = /([0-9]+):([0-9]+)/;
            let m = rx.exec(time);
            let hr = parseInt(m[1]);
            let ind = 'a';
            if (hr > 12) {
                hr -= 12;
                ind = 'p';
            }
            if (m[2] == '00') {
                return hr + ind;
            } else {
                return hr + ':' + m[2] + ind;
            }
        };
        let desc;
        if (['pool', 'classroom'].includes(rsv.category)) {
            desc = ' ' + fmt(rsv.startTime) + '-' + fmt(rsv.endTime);
        } else if (rsv.category === 'openwater') {
            desc = rsv.maxDepth + 'm - ' + rsv.owTime;
        }
        return desc;
    };

</script>

{#if $user}
    <table class="m-auto border-separate border-spacing-y-1">
        <tbody>
            {#each $reservations as rsv}
                {#if rsv.user.id === $user.id && getResType(rsv) === resType} 
                    <tr class='[&>td]:w-24 h-10 bg-gradient-to-br {bgColorFrom(rsv.category)} {bgColorTo(rsv.category)}'>
                        <td class='rounded-s-xl text-white text-sm font-semibold'>{shortDate(rsv.date)}</td>
                        <td class='text-white text-sm font-semibold'>{catDesc(rsv)}</td>
                        <td class='text-white text-sm font-semibold'>{timeDesc(rsv)}</td>
                        <td class='text-white text-sm font-semibold'>{rsv.status}</td>
                        <td>
                            <Modal>
                                <Dialog dialogType='modify' rsv={rsv}/>
                            </Modal>
                        </td>
                        <td class='rounded-e-xl'>
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
