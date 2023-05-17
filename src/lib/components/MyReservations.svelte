<script>
    import { datetimeToLocalDateStr, monthIdxFromDateStr } from '$lib/datetimeUtils.js';
    import { minuteOfDay, beforeCancelCutoff } from '$lib/reservationTimes.js';
    import { timeStrToMin, idx2month } from '$lib/datetimeUtils.js';
    import { user, userPastReservations, reservations } from '$lib/stores.js';
    import { getContext } from 'svelte';
    import Modal from './Modal.svelte';
    import CancelDialog from './CancelDialog.svelte';
    import RsvTabs from './RsvTabs.svelte';
    import { Settings } from '$lib/settings.js';

    export let resPeriod; /* past or upcoming */

    function getResPeriod(rsv) {
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
                    rsvMin = timeStrToMin(Settings.get('openwaterAmEndTime', rsv.date));
                } else if (rsv.owTime === 'PM') {
                    rsvMin = timeStrToMin(Settings.get('openwaterPmEndTime', rsv.date));
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
            if (hr >= 12) {
                ind = 'p';
            }
            if (hr > 12) {
                hr -= 12;
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
            desc = rsv.owTime + ' ' + rsv.maxDepth + 'm ';
        }
        return desc;
    };
    
    const { open } = getContext('simple-modal');

    const showViewRsv = (rsv) => {
        open(
            RsvTabs,
            {
                rsvs: [rsv], 
                hasForm: true,
            }
        );
    };

    const sortChronologically = (rsvs, resPeriod) => {
        let sign = resPeriod === 'upcoming' ? 1 : -1;
        return rsvs.sort((a,b) => {
            if (a.date > b.date) {
                return sign;
            } else if (a.date === b.date && timeStrToMin(a.startTime) > timeStrToMin(b.startTime)) {
                return sign;
            } else {
                return -sign;
            }
        });
    };

    const groupRsvs = (resPeriod, allRsvs, userPastRsvs) => {
        let rsvs;
        if (resPeriod === 'upcoming') {
            rsvs = allRsvs.filter(rsv => {
                return rsv.user.id === $user.id && getResPeriod(rsv) === resPeriod;
            });
        } else if (resPeriod === 'past') {
            rsvs = userPastRsvs.filter(rsv => getResPeriod(rsv) === resPeriod);
        }

        let sorted = sortChronologically(rsvs, resPeriod);

        if (resPeriod === 'upcoming') {
            return [{ rsvs: sorted }];
        } else if (resPeriod === 'past') {
            let curM;
            return sorted.reduce((grps, rsv) => {
                let m = monthIdxFromDateStr(rsv.date);
                if (m === curM) {
                    grps[grps.length-1].rsvs.push(rsv);
                } else {
                    curM = m;
                    grps.push({ month: idx2month[curM], rsvs: [rsv] });
                }
                return grps;
            }, []);
        }
    }

    $: rsvGroups = groupRsvs(resPeriod, $reservations, $userPastReservations);

    const textColor = (status) => status === 'confirmed' 
        ? 'text-status-confirmed' : status === 'pending'
        ? 'text-status-pending' : status === 'rejected'
        ? 'text-status-rejected' : undefined;

    const statusStyle = (status) => 'align-middle m-auto w-fit '
                    + 'rounded-lg ' + textColor(status); 
    
    const totalThisMonth = (rsvs) => {
        return rsvs.reduce((t, rsv) => rsv.price !== null ? t + rsv.price : t, 0);
    };

</script>

{#if $user}
    <table class="m-auto border-separate border-spacing-y-1">
        <tbody>
            {#each rsvGroups as { month, rsvs }}
                {#each rsvs as rsv (rsv.id)}
                    <tr 
                        on:click={showViewRsv(rsv)} on:keypress={showViewRsv(rsv)} 
                        class='[&>td]:w-24 h-10 bg-gradient-to-br {bgColorFrom(rsv.category)} {bgColorTo(rsv.category)} cursor-pointer'
                    >
                        <td class='rounded-s-xl text-white text-sm font-semibold'>{shortDate(rsv.date)}</td>
                        <td class='text-white text-sm font-semibold'>{catDesc(rsv)}</td>
                        <td class='text-white text-sm font-semibold'>{timeDesc(rsv)}</td>
                        <td class='text-white text-sm font-semibold'>
                            <div class={statusStyle(rsv.status)}>{rsv.status}</div>
                        </td>
                        {#if beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category)}
                            <td 
                                on:click|stopPropagation={()=>{}} 
                                on:keypress|stopPropagation={()=>{}}
                                class='rounded-e-xl'
                            >
                                <Modal>
                                    <CancelDialog rsv={rsv}/>
                                </Modal>
                            </td>
                        {:else}
                            <td class='text-white text-sm font-semibold rounded-e-xl'>
                                {#if rsv.price == null}
                                    TBD
                                {:else}
                                    ₱{rsv.price}
                                {/if}
                            </td>
                        {/if}
                    </tr>
                {/each}
                {#if resPeriod === 'past'}
                    <tr class='[&>td]:w-24 h-10'>
                        <td/><td/><td/>
                        <td class='bg-rose-500 text-white text-sm font-semibold rounded-s-xl'>
                            {month} Total:
                        </td> 
                        <td class='bg-rose-500 text-white text-sm font-semibold rounded-e-xl'>
                            ₱{totalThisMonth(rsvs)}
                        </td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
{/if}
