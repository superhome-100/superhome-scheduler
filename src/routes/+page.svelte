<script lang="js">
    import Modal from '$lib/components/Modal.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import MyReservationsTable from '$lib/components/MyReservationsTable.svelte';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { minValidDate } from '$lib/ReservationTimes.js';
    import { user } from '$lib/stores.js';

</script>

{#if $user != null}
    <br/>
    <span class='flex justify-between mr-2'>
        <span/>
        <span class='text-lg font-semibold'>{$user.name.split(' ')[0]}'s Reservations</span>
        <Modal><ReservationDialog dateFn={minValidDate}/></Modal>
    </span>
    <div>
        <Tabs>
            
            <TabList>
                <Tab>Upcoming</Tab>
                <Tab>Past</Tab>
            </TabList>
            
            <TabPanel>
                <MyReservationsTable resType='upcoming'/>
            </TabPanel>
            <TabPanel>
                <MyReservationsTable resType='past'/>
            </TabPanel>
        
        </Tabs>
    </div>
    <br/>
{/if}
