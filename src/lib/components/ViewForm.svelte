<script>
    import { getContext, createEventDispatcher } from 'svelte';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { popup } from './Popup.svelte';
    import { reservations, user, users } from '$lib/stores.js';
    import { adminView } from '$lib/utils.js';
    import { toast, Toaster } from 'svelte-french-toast';

    export let hasForm = false;
    export let rsv;

    const dispatch = createEventDispatcher();

    const { close } = getContext('simple-modal');

    const rsvChanged = (orig, form) => {
        if (orig.status != form.get('status')) {
            return true;
        }
        if (orig.category === 'pool') {
            if (orig.lanes[0] != form.get('lane1')) {
                return true;
            }
            if (form.has('lane2') && orig.lanes[1] != form.get('lane2')) {
                return true;
            }
        } else if (orig.category === 'openwater') {
            return orig.buoy != form.get('buoy');
        } else if (orig.category === 'classroom') {
            return orig.room != form.get('room');
        }
        return false;
    };

    const copyChanges = (rsv, upd) => {
        rsv.status = upd.status;
        if (rsv.category === 'pool') {
            rsv.lanes[0] = upd.lanes[0];
            if (upd.lanes.length > 1) {
                rsv.lanes[1] = upd.lanes[1];
            }
        } else if (rsv.category === 'openwater') {
            rsv.buoy = upd.buoy;
        } else if (rsv.category === 'classroom') {
            rsv.room = upd.room;
        }
    };

    const adminUpdate = async ({ form, data, action, cancel }) => {
        let status = action.href.includes('Confirmed') 
            ? 'confirmed' : action.href.includes('Rejected')
            ? 'rejected' : action.href.includes('Pending')
            ? 'pending' : undefined;
        data.set('status', status);
        if (!rsvChanged(rsv, data)) {
            cancel();
            dispatch('submit', { rsv });
            return;
        }

        if (data.has('lane2')) {
            if (
                (data.get('lane1') === 'auto' && data.get('lane2') !== 'auto')
                || (data.get('lane1') !== 'auto' && data.get('lane2') === 'auto')
            ) {
                popup('Either both lanes must be assigned or both must be auto');
                cancel();
                return;
            }
            if (data.get('lane1') !== 'auto' && data.get('lane1') === data.get('lane2')) {
                popup('Cannot assign same value for 1st and 2nd Lane');
                cancel();
                return;
            }
        }

        dispatch('submit', { rsv });
        
        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    if (result.data.status === 'success') {
                        let updated = result.data.record;
                        copyChanges(rsv, updated);
                        $reservations = [...$reservations];
                        toast.success('Reservation updated!');
                    } else if (result.data.status === 'error') {
                        toast.error('Server returned error!')
                    }
                    break;
                default:
                    console.error(result);
                    toast.error('Update failed with unknown error!');
                    break;
            }
        }
    };

</script>

{#if hasForm}
    <form
        method='POST'
        action='/?/adminUpdateConfirmed'
        use:enhance={adminUpdate}
    >
        {#if rsv.category === 'pool'}
            <ResFormPool viewOnly {rsv}/>
        {:else if rsv.category === 'openwater'}
            <ResFormOpenWater viewOnly {rsv}/>
        {:else if rsv.category === 'classroom'}
            <ResFormClassroom viewOnly {rsv}/>
        {/if}
        <input type="hidden" name="id" value={rsv.id}> 
        {#if adminView(true)}
            <div class='[&>*]:mx-auto w-full inline-flex items-center justify-between'>
                <button
                    formaction='/?/adminUpdateRejected'
                    class='bg-status-rejected px-3 py-1'
                >Reject</button>
                <button
                    formaction='/?/adminUpdatePending'
                    class='bg-status-pending px-3 py-1'
                >Pending</button>
                <button
                    type='submit'
                    class='bg-status-confirmed px-3 py-1'
                    tabindex='6'
                >Confirm</button>
            </div>
        {/if}
    </form>
{/if}

