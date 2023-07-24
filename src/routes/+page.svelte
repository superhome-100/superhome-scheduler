<script lang="js">
	import Modal from '$lib/components/Modal.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import MyReservations from '$lib/components/MyReservations.svelte';
	import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
	import { minValidDateStr } from '$lib/reservationTimes.js';
	import { Settings } from '$lib/settings.js';
	import { user, stateLoaded } from '$lib/stores';
</script>

{#if $stateLoaded}
	<span class="flex items-center justify-between mr-2">
		<span />
		<span class="text-lg font-semibold">{$user.name.split(' ')[0]}'s Reservations</span>
		<Modal><ReservationDialog dateFn={(cat) => minValidDateStr(Settings, cat)} /></Modal>
	</span>
	<Tabs>
		<TabList>
			<Tab>Upcoming</Tab>
			<Tab>Completed</Tab>
		</TabList>

		<TabPanel>
			<Modal>
				<MyReservations resPeriod="upcoming" />
			</Modal>
		</TabPanel>
		<TabPanel>
			<Modal>
				<MyReservations resPeriod="past" />
			</Modal>
		</TabPanel>
	</Tabs>
{/if}
