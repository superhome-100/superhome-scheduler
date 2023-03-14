<script lang="js">
    import ReservationsTable from '$lib/components/ReservationsTable.svelte';
    import { user, reservations } from '$lib/stores.js';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    import { datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

    export let data;

    $: userRsvs = sortByNow(
        $reservations.filter((rsv) => rsv.user.id === data.user.id)
    );

    function sortByNow(rsvs) {
        let now = new Date();
        let today = datetimeToLocalDateStr(now);
        let minute = now.getHours()*60 + now.getMinutes();
        let rsvMin;
        let view;
        
        let sorted = {'upcoming': [], 'past': []}
        
        for (let rsv of rsvs) {
            if (rsv.date > today) {
                view = 'upcoming';
            } else if (rsv.date < today) {
                view = 'past'
            } else {
                if (rsv.category in ['pool', 'classroom']) {
                    rsvMin = timeStrToMin(rsv.endTime);
                } else if (rsv.category === 'openwater') {
                    if (rsv.owTime === 'AM') {
                        rsvMin = 11*60; // 11am end time
                    } else if (rsv.owTime === 'PM') {
                        rsvMin = 16*60; // 4pm end time
                    }
                }
                view = rsvMin >= minute ? 'upcoming' : 'past';
            }
            sorted[view].push(rsv);
        }
        return sorted;
    }

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
                reservations={userRsvs.upcoming}
            />
        </TabPanel>
        <TabPanel>
            <ReservationsTable 
                resType='past' 
                reservations={userRsvs.past}
            />
        </TabPanel>
    
    </Tabs>
</div>
<br/>
