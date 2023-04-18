<script lang="js">
    import Modal from '$lib/components/Modal.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import MyReservationsTable from '$lib/components/MyReservationsTable.svelte';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';
    import { user } from '$lib/stores.js';

</script>

{#if $user != null}
    <span class='flex items-center justify-between mr-2'>
        <span/>
        <span class='text-lg font-semibold'>{$user.name.split(' ')[0]}'s Reservations</span>
        <Modal><ReservationDialog dateFn={(cat) => minValidDateStr(cat)}/></Modal>
    </span>
    <div>
        <Tabs>
            
            <TabList>
                <Tab>Upcoming</Tab>
                <Tab>Previous Week</Tab>
            </TabList>
            
            <TabPanel>
                <Modal>
                    <MyReservationsTable resType='upcoming'/>
                </Modal>
            </TabPanel>
            <TabPanel>
                <Modal>
                    <MyReservationsTable resType='past'/>
                </Modal>
            </TabPanel>
        
        </Tabs>
    </div>
    <br/>
{/if}
