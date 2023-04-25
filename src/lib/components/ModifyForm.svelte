<script>
    import { getContext } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { canSubmit, user, users, reservations, buoys } from '$lib/stores.js';
    import { beforeCancelCutoff, beforeResCutoff } from '$lib/ReservationTimes.js';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { Settings } from '$lib/settings.js';
    import { 
        augmentRsv, 
        removeRsv, 
        validateBuddies, 
        updateReservationFormData, 
        convertReservationTypes,
        checkDuplicateRsv,
        checkSpaceAvailable,
        categoryIsBookable
    } from '$lib/utils.js';

    export let hasForm = false;
    export let rsv;

    const { close } = getContext('simple-modal');

    const reservationChanges = (submitted, original) => {
        const isEmpty = (v) => v == null || v == '' || (Object.hasOwn(v, 'length') && v.length == 0);
        const bothEmpty = ((a,b) => isEmpty(a) && isEmpty(b));

        for (let field in submitted) {
            if (field === 'user') { continue };
            
            let a = original[field];
            let b = submitted[field];
            
            if (bothEmpty(a,b)) { continue };

            if (field === 'buddies') {
                if (a == null || b == null) {
                    return 'buddies';
                }
                if (a.length != b.length) {
                    return 'buddies';
                }
                for (let id of a) {
                    if (!b.includes(id)) {
                        return 'buddies';
                    }
                }
            } else if (a !== b) {
                return field;
            }
        }
        return null;
    };

    const addMissingFields = (submitted, original) => {
        for (let field in original) {
            if (submitted[field] === undefined) {
                submitted[field] = original[field];
            }
        }
    };

    const updateReservation = async ({ form, data, action, cancel }) => {
        updateReservationFormData(data, rsv.category);
        data.set('category', rsv.category);

        let submitted = convertReservationTypes(Object.fromEntries(data));
        addMissingFields(submitted, rsv);

        if (!Settings('openForBusiness', submitted.date)) {
            alert('We are closed on this date; please choose a different date');
            cancel();
            return;
        }

        const q = categoryIsBookable(submitted);
        if (q.result == false) {
            alert(q.message);
            cancel();
            return;
        }

        let change = reservationChanges(submitted, rsv)
        if (change == null) {
            cancel();
            close();
            return;
        } 
        
        data.append('oldBuddies', JSON.stringify(rsv.buddies));

        if (!beforeCancelCutoff(submitted.date, submitted.startTime, submitted.category)) {
            alert(`The modification window for this reservation has expired; 
                this reservation can no longer be modified`
            );
            cancel();
        }
 
        if (checkDuplicateRsv(submitted, $reservations)) {
            alert(
                'You have an existing reservation that overlaps with this date/time; ' +
                'please either cancel that reservation, or choose a different date/time'
            );
            cancel();
            return;
        }

        let result = checkSpaceAvailable(submitted, $reservations, $buoys); 
        if (result.status === 'error') {
            alert(result.message);
            cancel();
            return;
        }
        
        result = validateBuddies(submitted);
        if (result.status == 'error') {
            alert(result.msg);
            cancel();
            return;
        }
        
       close();

        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    if (result.data.status === 'success') {
                        let records = result.data.records;
                        for (let rsv of records.modified) {
                            let user = $users[rsv.user.id];
                            removeRsv(rsv.id);
                            rsv = augmentRsv(rsv, user.facebookId, user.name);
                            $reservations.push(rsv);
                        }
                        for (let rsv of records.created) {
                            let user = $users[rsv.user.id];
                            rsv = augmentRsv(rsv, user.facebookId, user.name);
                            $reservations.push(rsv);
                        }
                        for (let rsv of records.canceled) {
                            removeRsv(rsv.id);
                        }
                        $reservations = [...$reservations];
                        toast.success('Reservation updated!');
                    } else if (result.data.status === 'error') {
                        if (result.data.code === 'BUDDY_RSV_EXISTS') {
                            alert('Buddy reservation already exists!  Reservation rejected');
                        }
                    }
                    break;
                default:
                    console.error(result);
                    toast.error('Update failed with unknown error!');
                    break;
            }
        };
    };
    
    let restrictModify = !beforeResCutoff(rsv.date, rsv.startTime, rsv.category);
    let viewOnly = !rsv.owner 
            || !beforeCancelCutoff(rsv.date, rsv.startTime, rsv.category) 
            || (restrictModify && rsv.resType === 'autonomous');

</script>

{#if hasForm}
    {#if viewOnly}
        <div class='mb-4'>
            <div class='form-title'>
                {rsv.user.name}
            </div>       
            {#if rsv.category === 'pool'}
                <ResFormPool viewOnly {rsv}/>
            {:else if rsv.category === 'openwater'}
                <ResFormOpenWater viewOnly {rsv}/>
            {/if}
        </div>
    {:else}
        <div>
            <div class='form-title'>modify reservation</div>
            <form 
                method="POST" 
                action="/?/updateReservation" 
                use:enhance={updateReservation}
            >
                <input type="hidden" name="id" value={rsv.id}>
                {#if rsv.category === 'pool'}
                    <ResFormPool {restrictModify} {rsv}/>
                {:else if rsv.category === 'openwater'}
                    <ResFormOpenWater {restrictModify} {rsv}/>
                {:else if rsv.category === 'classroom'}
                    <ResFormClassroom {rsv}/>
                {/if}
            </form>
        </div>
    {/if}
{/if}

<Toaster/>
