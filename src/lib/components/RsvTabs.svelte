<script>
    import { Tab, Tabs, TabList, TabPanel } from '$lib/tabs.js';
    import ViewForm from '$lib/components/ViewForm.svelte';
    import ModifyForm from '$lib/components/ModifyForm.svelte';
    import { user } from '$lib/stores.js';

    export let rsvs;
    export let hasForm;
</script>

<div class='mb-4'>

    <Tabs>

        <TabList>
            {#each rsvs as rsv}
                <Tab>{rsv.user.name}</Tab>
            {/each}
        </TabList>
        
        {#each rsvs as rsv}
            <TabPanel>
                {#if $user.id === rsv.user.id}
                    <ModifyForm {hasForm} {rsv}/>
                {:else}
                    <ViewForm {hasForm} {rsv}/>
                {/if}
            </TabPanel>
        {/each}
    </Tabs>

</div>

