<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import MyReservations from '$lib/components/MyReservations.svelte';
	import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs.js';
	import { minValidDateStr } from '$lib/reservationTimes';
	import { Settings } from '$lib/client/settings';
	import { user, stateLoaded, loginState } from '$lib/stores';

	let modalOpened = false;
	const onOpen = () => (modalOpened = true);
	const onClose = () => (modalOpened = false);
</script>

{#if $user != null}
	<span class="flex items-center justify-between mr-2">
		<span />
		<span class="text-lg font-semibold">{($user?.name || '').split(' ')[0]}'s Reservations</span>
		<Modal><ReservationDialog dateFn={(cat) => minValidDateStr(Settings, cat)} /></Modal>
	</span>
	<Tabs disableNav={modalOpened}>
		<TabList>
			<Tab>Upcoming</Tab>
			<Tab>Completed</Tab>
		</TabList>

		<TabPanel>
			<Modal on:open={onOpen} on:close={onClose}>
				<MyReservations resPeriod="upcoming" />
			</Modal>
		</TabPanel>
		<TabPanel>
			<Modal on:open={onOpen} on:close={onClose}>
				<MyReservations resPeriod="past" />
			</Modal>
		</TabPanel>
	</Tabs>
{:else}
	<h1>loading data...</h1>
{/if}
