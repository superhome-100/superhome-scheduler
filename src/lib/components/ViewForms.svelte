<script>
    import { getContext } from 'svelte';
    import { enhance } from '$app/forms';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import {Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { reservations, user, users } from '$lib/stores.js';
    import { augmentRsv, removeRsv } from '$lib/utils.js';
    import { toast, Toaster } from 'svelte-french-toast';

    export let hasForm = false;
    export let rsvs;

    const { close } = getContext('simple-modal');

    const adminUpdate = async ({ form, data, action, cancel }) => {
        let orig = rsvs.filter(rsv => rsv.id === data.get('id'))[0];
        const resUpdated = () => {
            if (orig.status != data.get('status')) {
                return true;
            }
            if (orig.category === 'pool') {
                if (orig.lanes[0] != data.get('lane1')) {
                    return true;
                }
                if (data.has('lane2')) {
                    return orig.lanes[1] != data.get('lane2');
                } else {
                    return false;
                }
            } else if (orig.category === 'openwater') {
                return orig.buoy != data.get('buoy');
            } else if (orig.category === 'classroom') {
                return orig.room != data.get('room');
            }
        };

        if (!resUpdated()) {
            cancel();
            close();
            return;
        }

        if (data.has('lane2')) {
            if (
                (data.get('lane1') === 'undefined' && data.get('lane2') !== 'undefined')
                || (data.get('lane1') !== 'undefined' && data.get('lane2') === 'undefined')
            ) {
                alert('Either both lanes must be assigned or both must be auto');
                cancel();
                return;
            }
            if (data.get('lane1') === data.get('lane2')) {
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
                            augmentRsv(rsv, user.facebookId, user.name)
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
    <div class='mb-4'>
        
        <Tabs>

            <TabList>
                {#each rsvs as rsv}
                    <Tab>{rsv.user.name}</Tab>
                {/each}
            </TabList>
            
            {#each rsvs as rsv}
                <TabPanel>
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
                </TabPanel>
            {/each}
        </Tabs>
    </div>
{/if}

<Toaster/>
