<script>
    import { getContext } from 'svelte';
    import ResFormPool from './ResFormPool.svelte';
    import ResFormClassroom from './ResFormClassroom.svelte';
    import ResFormOpenWater from './ResFormOpenWater.svelte';
    import {Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    export let hasForm = false;
    export let rsvs;

    const { close } = getContext('simple-modal');

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
                    {#if rsv.category === 'pool'}
                        <ResFormPool viewOnly {rsv}/>
                    {:else if rsv.category === 'openwater'}
                        <ResFormOpenWater viewOnly {rsv}/>
                    {:else if rsv.category === 'classroom'}
                        <ResFormClassroom viewOnly {rsv}/>
                    {/if}
                </TabPanel>
            {/each}
        </Tabs>
    </div>
{/if}

