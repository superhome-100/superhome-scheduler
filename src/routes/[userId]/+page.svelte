<script lang="js">
    import ReservationsTable from '$lib/components/ReservationsTable.svelte';
    import { user, reservations, myReservations } from '$lib/stores.js';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { sortUserReservations } from '$lib/utils.js';

    export let data;

    let sorted = sortUserReservations(data.reservations, data.user.id);

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
                reservations={sorted.upcoming}
            />
        </TabPanel>
        <TabPanel>
            <ReservationsTable 
                resType='past' 
                reservations={sorted.past}
            />
        </TabPanel>
    
    </Tabs>
</div>
<br/>
