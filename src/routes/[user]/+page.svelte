<script lang="js">
    import ReservationsTable from '$lib/components/ReservationsTable.svelte';
    import { datetimeToDateStr } from '$lib/ReservationTimes.js';
    import { userId } from '$lib/stores.js';
    import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
    
    export let data;

    /* making this call in the client and not in the server load call because we
       need to pass the userId from the store to the server */
    async function fetchReservations() {
        const response = await fetch(`/${data.name}`, {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: $userId})
        });
        return await response.json();
    }

    function prepareReservations(view, rsvs) {
        let processedRsvs=[];
        let now = new Date().toISOString();
        const cond = (date) => view === 'upcoming' ? date >= now : date < now;
        let i = 0;
        for (let rsv of rsvs) {
            if (cond(rsv.date)) {
                processedRsvs.push({...rsv, id: i++, date: datetimeToDateStr(rsv.date)});
            }
        }
        return processedRsvs;
    }

</script>

{#if $userId}
    {#await fetchReservations() then reservations}
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
                        reservations={prepareReservations('upcoming', reservations)}
                    />
                </TabPanel>
                <TabPanel>
                    <ReservationsTable 
                        resType='past' 
                        reservations={prepareReservations('past', reservations)}
                    />
                </TabPanel>
            
            </Tabs>
        </div>

        <br/>
    {/await}
{/if}

