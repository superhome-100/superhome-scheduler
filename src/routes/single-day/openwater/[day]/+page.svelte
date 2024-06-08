<script lang="ts">
	import { page } from '$app/stores';
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import DayOpenWater from '$lib/components/DayOpenWaterV2.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { loginState, stateLoaded, view, viewMode } from '$lib/stores';
	import { CATEGORIES } from '$lib/constants.js';
	import { toast } from 'svelte-french-toast';
	import dayjs from 'dayjs';
	import type { Reservation } from '$types';

	import { flagOWAmAsFull, listenToDateSetting } from '$lib/firestore';
	import { onDestroy } from 'svelte';

	export let data;

	const category = 'openwater';

	let categories = [...CATEGORIES];

	let refreshTs = Date.now();
	let reservations: Reservation[] = [];

	$: groupsHaveBeenAssignedBuoy = reservations.every((rsv) => rsv.buoy !== 'auto');
	$: groupsAreAutoAssigned = reservations.every((rsv) => rsv.buoy === 'auto');

	const highlightButton = (active: boolean): string => {
		if (active) {
			return 'bg-openwater-bg-to text-white';
		} else {
			return 'bg-root-bg-light dark:bg-root-bg-dark';
		}
	};

	$view = 'single-day';

	function prevDay() {
		const prev = dayjs(data.day).subtract(1, 'day');
		goto(`/single-day/openwater/${prev.format('YYYY-MM-DD')}`);
	}
	function nextDay() {
		const next = dayjs(data.day).add(1, 'day');
		goto(`/single-day/openwater/${next.format('YYYY-MM-DD')}`);
	}

	let modalOpened = false;

	function swipeHandler(event: any) {
		if (!modalOpened) {
			if (event.detail.direction === 'left') {
				nextDay();
			} else if (event.detail.direction === 'right') {
				prevDay();
			}
		}
	}

	const toggleBuoyLock = async (lock: boolean) => {
		const day = data.day;
		const fn = async () => {
			const response = await fetch('/api/lockBuoyAssignments', {
				method: 'POST',
				headers: { 'Content-type': 'application/json' },
				body: JSON.stringify({
					lock,
					date: day
				})
			});
			let data = await response.json();
			if (data.status === 'success') {
				refreshTs = Date.now();
				reservations = data.reservations;
				return Promise.resolve();
			} else {
				console.error(data.error);
				return Promise.reject();
			}
		};
		// @ts-ignore
		toast.promise(fn(), {
			error: 'buoy lock failed'
		});
	};
	const lockBuoys = async () => toggleBuoyLock(true);
	const unlockBuoys = async () => toggleBuoyLock(false);

	let isAmFull = false;

	let unsubscribe: () => void;
	$: $page, handleRouteChange();

	function handleRouteChange() {
		if (unsubscribe) unsubscribe();
		// Place your route change detection logic here
		unsubscribe = listenToDateSetting(new Date(data.day), (setting) => {
			isAmFull = !!setting.ow_am_full;
		});
	}

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});
</script>

{#if $stateLoaded && $loginState === 'in'}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>Openwater</label
			>
			<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each categories as cat}
					{#if cat !== category}
						<li>
							<a class="text-xl active:bg-gray-300" href={`/single-day/${cat}/${data.day}`}>
								{cat}
							</a>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
		<div class="inline-flex items-center justify-between">
			<span on:click={prevDay} on:keypress={prevDay} class="cursor-pointer">
				<Chevron direction="left" svgClass="h-8 w-8" />
			</span>
			<span on:click={nextDay} on:keypress={nextDay} class="cursor-pointer">
				<Chevron direction="right" svgClass="h-8 w-8" />
			</span>
			<span class="text-2xl ml-2">
				{dayjs(data.day).format('MMMM DD, YYYY')}
			</span>
		</div>
		<span class="mr-2">
			<Modal
				on:open={() => (modalOpened = true)}
				on:close={() => {
					modalOpened = false;
					refreshTs = Date.now();
				}}
				><ReservationDialog
					{category}
					dateFn={() => data.day}
					onUpdate={() => {
						refreshTs = Date.now();
					}}
				/></Modal
			>
		</span>
	</div>
	<br />
	<div class="flex justify-between">
		<a
			class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700"
			href="/multi-day/openwater"
		>
			<span><Chevron direction="left" /></span>
			<span class="xs:text-xl pb-1 whitespace-nowrap">month view</span>
		</a>
		{#if $viewMode === 'admin'}
			<div class="flex gap-2">
				<button
					on:click={lockBuoys}
					class="{highlightButton(
						groupsHaveBeenAssignedBuoy
					)} px-1 py-0 font-semibold border-black dark:border-white"
				>
					Lock
				</button>
				<button
					on:click={unlockBuoys}
					class="{highlightButton(
						groupsAreAutoAssigned
					)} px-1 py-0 font-semibold border-black dark:border-white"
				>
					Unlock
				</button>
				<button
					class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white"
					on:click={() => {
						flagOWAmAsFull(new Date(data.day), !isAmFull);
					}}
				>
					mark morning as {isAmFull ? 'not' : ''} full
				</button>
			</div>
		{/if}
	</div>
	<br />
	<div
		class="w-full min-h-[500px]"
		use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }}
		on:swipe={swipeHandler}
	>
		<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}>
			<DayOpenWater
				date={data.day}
				{isAmFull}
				{refreshTs}
				onUpdateReservations={(rsvs) => {
					reservations = rsvs;
				}}
			/>
		</Modal>
	</div>
{/if}
