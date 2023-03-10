<script lang="js">
    import ReservationsTable from '$lib/components/ReservationsTable.svelte';
    import { userId, myReservations } from '$lib/stores.js';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { sortUserReservations } from '$lib/utils.js';

    export let data;

    $myReservations = sortUserReservations(data.reservations);

</script>

<br/>
<div>
    <Tabs divId="myreservations_tabs">
        
        <TabList>
            <Tab>Upcoming</Tab>
            <Tab>Past</Tab>
        </TabList>
        
        <TabPanel>
            <ReservationsTable 
                resType='upcoming' 
                reservations={$myReservations.upcoming}
            />
        </TabPanel>
        <TabPanel>
            <ReservationsTable 
                resType='past' 
                reservations={$myReservations.past}
            />
        </TabPanel>
    
    </Tabs>
</div>
<br/>

