<script lang="js">
    import Modal from '$lib/components/Modal.svelte';
    import ReservationDialog from '$lib/components/ReservationDialog.svelte';
    import MyReservationsTable from '$lib/components/MyReservationsTable.svelte';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { minValidDate } from '$lib/ReservationTimes.js';
</script>

<Modal>
    <ReservationDialog date={minValidDate()}/>
</Modal>

<br/>
<div>
    <Tabs divId="myreservations_tabs">
        
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
