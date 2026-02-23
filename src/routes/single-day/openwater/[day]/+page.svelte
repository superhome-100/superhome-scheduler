<script lang="ts">
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import DayOpenWater from '$lib/components/DayOpenWaterV2.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { viewMode } from '$lib/stores';
	import { CATEGORIES } from '$lib/constants';
	import { toast } from 'svelte-french-toast';
	import { ReservationCategory } from '$types';
	import { getCategoryDatePath } from '$lib/url';
	import {
		approveAllPendingReservations,
		flagOWAmAsFull,
		lockBuoyAssignments
	} from '$lib/client/api';
	import { getYYYYMM, getYYYYMMDD, PanglaoDayJs } from '$lib/datetimeUtils';
	import {
		storedDaySettings,
		storedDayReservations,
		storedDayReservations_param,
		storedUser
	} from '$lib/client/stores';
	import { ow_am_full } from '$lib/dateSettings';
	import type { Enums } from '$lib/supabase.types';

	// svelte-ignore unused-export-let
	export let params;
	export let data;
	const { supabase } = data;

	$: day = PanglaoDayJs(data.day);
	$: dayStr = getYYYYMMDD(day);
	$: storedDayReservations_param.set({ day: dayStr });

	let category: Enums<'reservation_category'> = 'openwater';

	let categories = [...CATEGORIES];

	$: reservations = $storedDayReservations.filter(
		(r) => r.category == ReservationCategory.openwater
	);

	$: groupsHaveBeenAssignedBuoy = reservations.every((rsv) => rsv.buoy !== 'auto');
	$: groupsAreAutoAssigned = reservations.every((rsv) => rsv.buoy === 'auto');

	const highlightButton = (active: boolean): string => {
		if (active) {
			return 'bg-openwater-bg-to text-white';
		} else {
			return 'bg-root-bg-light dark:bg-root-bg-dark';
		}
	};

	function prevDay() {
		const prev = day.subtract(1, 'day');
		goto(getCategoryDatePath('openwater', getYYYYMMDD(prev)));
	}
	function nextDay() {
		const next = day.add(1, 'day');
		goto(getCategoryDatePath('openwater', getYYYYMMDD(next)));
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

	function handleKeypress(e: any) {
		const { tagName } = e.target;
		const isEditable = e.target.isContentEditable;

		// Filter out inputs, textareas, and contenteditable elements
		if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isEditable) {
			return;
		}

		if (!modalOpened) {
			if (e.keyCode == 37) {
				// left arrow key
				prevDay();
			} else if (e.keyCode == 39) {
				// right arrow key
				nextDay();
			} else if (e.keyCode == 84) {
				// letter 't'
				day = PanglaoDayJs();
			}
		}
	}

	const toggleBuoyLock = async (lock: boolean) => {
		toast.promise(lockBuoyAssignments(dayStr, lock), {
			loading: (lock ? 'L' : 'Unl') + 'ocking buoy assignments',
			success: (lock ? 'L' : 'Unl') + 'ocked buoy assignments',
			error: 'Failed to ' + (lock ? '' : 'u') + 'nlock buoy assignments'
		});
	};
	const lockBuoys = async () => toggleBuoyLock(true);
	const unlockBuoys = async () => toggleBuoyLock(false);

	$: isAmFull = $storedDaySettings[ow_am_full];
</script>

<svelte:window on:keydown={handleKeypress} />

{#if $storedUser}
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
							<a class="text-xl active:bg-gray-300" href={getCategoryDatePath(cat, dayStr)}>
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
				{day.format('MMMM DD, YYYY dddd')}
			</span>
		</div>
		<span class="mr-2">
			<Modal
				on:open={() => (modalOpened = true)}
				on:close={() => {
					modalOpened = false;
				}}><ReservationDialog {category} dateFn={() => dayStr} /></Modal
			>
		</span>
	</div>
	<br />
	<div class="flex justify-between">
		<a
			class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700"
			href="/multi-day/openwater/{getYYYYMM(day)}"
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
					class="{highlightButton(isAmFull)} px-1 py-0 font-semibold border-black dark:border-white"
					on:click={async () => {
						const n = isAmFull ? 'not full' : 'full';
						await toast.promise(flagOWAmAsFull(supabase, dayStr, !isAmFull), {
							loading: 'Marking AM as ' + n,
							success: 'Marked AM as ' + n,
							error: 'Failed to makr AM as ' + n
						});
					}}
				>
					<span>AM full</span>
				</button>
				<button
					class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white"
					on:click={async () => {
						await toast.promise(
							approveAllPendingReservations(ReservationCategory.openwater, dayStr),
							{
								loading: 'Approving all reservations...',
								success: 'Approved all reservations',
								error: 'Failed to approve all reservations'
							}
						);
					}}
				>
					Approve All
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
			<DayOpenWater date={dayStr} {reservations} {isAmFull} />
		</Modal>
	</div>
{/if}
