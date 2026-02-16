<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import { Tabs, TabList, TabPanel, Tab } from '$lib/tabs';
	import { minValidDateStr } from '$lib/reservationTimes';
	import { storedSettings, storedUser as user } from '$lib/client/stores';
	import type { UserEx } from '$types';
	import MyReservationsUpcoming from '$lib/components/MyReservationsUpcoming.svelte';
	import MyReservationsPassed from '$lib/components/MyReservationsPassed.svelte';

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
	{#if $user.status === 'disabled'}
		<div class="text-lg font-semibold text-center justify-center">
			<div>
				<br />Welcome back. This account is currently disabled.<br />
				Contact the administrators. <br />
				Via <button on:click={() => openWhatsApp($user)}> WhatsApp </button><br />
				Or
				<button on:click={() => copyToClipboard($user)}> click here </button>
				to copy an activation link<br />and send it to the administrators.
			</div>
		</div>
		<br />
		<br />
	{/if}
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
				<MyReservationsUpcoming />
			</Modal>
		</TabPanel>
		<TabPanel>
			<Modal on:open={onOpen} on:close={onClose}>
				<MyReservationsPassed />
			</Modal>
		</TabPanel>
	</Tabs>
{:else}
	<br />
	<div class="loader_parent">
		<div class="loader" />
	</div>
	<style>
		.loader_parent {
			width: 100%; /* w-full */
			display: flex;
			justify-content: center;
		}
		.loader {
			/* Geometric dimensions */
			width: 50px;
			height: 50px;

			/* Visual definition */
			border: 5px solid #f3f3f3; /* Track color */
			border-top: 5px solid #3498db; /* Indicator color */
			border-radius: 50%; /* Circular clipping */

			/* Animation properties */
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
	</style>
{/if}
