<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import MyReservations from '$lib/components/MyReservations.svelte';
	import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs';
	import { minValidDateStr } from '$lib/reservationTimes';
	import { storedSettings, storedUser as user } from '$lib/client/stores';
	import type { UserEx } from '$types';

	// svelte-ignore unused-export-let
	export let params;

	let modalOpened = false;
	const onOpen = () => (modalOpened = true);
	const onClose = () => (modalOpened = false);

	const getActivationLink = (user: UserEx) => {
		return (
			window.location.origin +
			'/api/admin/activateUser/' +
			encodeURIComponent(user.email ?? user.id)
		);
	};
	const openWhatsApp = (user: UserEx) => {
		const phoneNumber = '639763854480';
		const message = encodeURIComponent(
			'Hello, Please activate my account: ' + getActivationLink(user)
		);
		const url = `https://wa.me/${phoneNumber}?text=${message}`;
		window.open(url, '_blank', 'noopener,noreferrer');
	};
	const copyToClipboard = (user: UserEx) => {
		const link = getActivationLink(user);
		navigator.clipboard.writeText(link);
	};
</script>

{#if $user != null}
	<div class="flex w-full">
		<div
			class="text-lg font-semibold flex-grow text-center align-middle justify-center flex items-center"
		>
			{($user.name || '').split(' ')[0]}'s Reservations
		</div>
		<div class="flex-shrink-0" style="flex-basis: 48px;">
			{#if $user.status !== 'disabled'}
				<Modal><ReservationDialog dateFn={(cat) => minValidDateStr($storedSettings, cat)} /></Modal>
			{/if}
		</div>
	</div>
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
	{#if $user.status === 'disabled'}
		<div
			class="text-lg font-semibold flex-grow text-center align-middle justify-center flex items-center"
		>
			<div>
				Welcome back. This account is currently disabled.<br />
				Contact the administrators. <br /><br />
				Via <button on:click={() => openWhatsApp($user)}> WhatsApp </button><br /><br />
				Or
				<button on:click={() => copyToClipboard($user)}> copy this link to your clipboard </button> and
				send to them.
			</div>
		</div>
	{/if}
{:else}
	<h1>loading data...</h1>
{/if}
