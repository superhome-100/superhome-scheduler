<script>
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { minuteOfDay, beforeCancelCutoff } from '$lib/ReservationTimes.js';
    import { timeStrToMin, idx2month } from '$lib/datetimeUtils.js';
    import { user, reservations } from '$lib/stores.js';
    import { getContext } from 'svelte';
    import Modal from './Modal.svelte';
    import Dialog from './Dialog.svelte';
    import ModifyForm from './ModifyForm.svelte';
    import ViewForms from './ViewForms.svelte';

    export let resType; /* past or upcoming */

    function getResType(rsv) {
        let view;
        let today = new Date();
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
    
    const { open } = getContext('simple-modal');

    const showModify = (rsv) => {
        if (beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category)) { 
		    open(
			    ModifyForm,
                {
                    rsv: rsv, 
                    hasForm: true,
                }
		    );
        } else {
            open(
                ViewForms,
                {
                    rsvs: [rsv], 
                    hasForm: true,
                }
		    );
        }
    };
    
    const getMyReservations = (rsvs, resType) => {
        rsvs = rsvs.filter((rsv) => rsv.user.id === $user.id && getResType(rsv) === resType);
        return rsvs.sort((a,b) => {
            if (a.date > b.date) {
                return 1;
            } else if (a.date === b.date && timeStrToMin(a.startTime) > timeStrToMin(b.startTime)) {
                return 1;
            } else {
                return -1;
            }
        });
    };
</script>

{#if $user}
    <table class="m-auto border-separate border-spacing-y-1">
        <tbody>
            {#each getMyReservations($reservations, resType) as rsv (rsv.id)}
                <tr 
                    on:click={showModify(rsv)} on:keypress={showModify(rsv)} 
                    class='[&>td]:w-24 h-10 bg-gradient-to-br {bgColorFrom(rsv.category)} {bgColorTo(rsv.category)} cursor-pointer'
                >
                    <td class='rounded-s-xl text-white text-sm font-semibold'>{shortDate(rsv.date)}</td>
                    <td class='text-white text-sm font-semibold'>{catDesc(rsv)}</td>
                    <td class='text-white text-sm font-semibold'>{timeDesc(rsv)}</td>
                    <td class='text-white text-sm font-semibold'>{rsv.status}</td>
                    {#if beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category)}
                        <td 
                            on:click|stopPropagation={()=>{}} 
                            on:keypress|stopPropagation={()=>{}}
                            class='rounded-e-xl'
                        >
                            <Modal>
                                <Dialog dialogType='cancel' rsv={rsv}/>
                            </Modal>
                        </td>
                    {:else}
                        <td class='rounded-e-xl'/>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
