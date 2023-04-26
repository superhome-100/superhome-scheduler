<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import { reservations, user, users } from '$lib/stores.js';
    import { augmentRsv, removeRsv } from '$lib/utils.js';
    import { toast, Toaster } from 'svelte-french-toast';

    export let hasForm = false;
    export let rsv;

    const { close } = getContext('simple-modal');

    const adminUpdate = async ({ form, data, action, cancel }) => {
        const resUpdated = () => {
            if (rsv.status != data.get('status')) {
                return true;
            }
            const convert = v => v === 'null' ? null : v;
            if (rsv.category === 'pool') {
                if (rsv.lanes[0] != convert(data.get('lane1'))) {
                    return true;
                }
                if (data.has('lane2')) {
                    return rsv.lanes[1] != convert(data.get('lane2'));
                } else {
                    return false;
                }
            } else if (rsv.category === 'openwater') {
                return rsv.buoy != convert(data.get('buoy'));
            } else if (rsv.category === 'classroom') {
                return rsv.room != convert(data.get('room'));
            }
        };

        if (!resUpdated()) {
            cancel();
            close();
            return;
        }

        if (data.has('lane2')) {
            if (
                (data.get('lane1') === 'null' && data.get('lane2') !== 'null')
                || (data.get('lane1') !== 'null' && data.get('lane2') === 'null')
            ) {
                alert('Either both lanes must be assigned or both must be auto');
                cancel();
                return;
            }
            if (data.get('lane1') !== 'null' && data.get('lane1') === data.get('lane2')) {
                alert('Cannot assign same value for 1st and 2nd Lane');
                cancel();
                return;
            }
        }

        close();

        return async ({ result, update }) => {
            switch(result.type) {
                case 'success':
                    if (result.data.status === 'success') {
                        let rsv = result.data.record;
                        let user = $users[rsv.user.id];
                        removeRsv(rsv.id);
                        $reservations = [
                            ...$reservations, 
                            augmentRsv(rsv, user)
                        ];
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
        action='/?/adminUpdate'
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
    </form>
{/if}

<Toaster/>
