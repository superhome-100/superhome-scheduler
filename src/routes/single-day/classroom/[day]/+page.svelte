<script lang="ts">
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { viewMode } from '$lib/stores';
	import { CATEGORIES } from '$lib/constants';
	import dayjs from 'dayjs';
	import { ReservationCategory } from '$types';
	import DayHourly from '$lib/components/DayHourly.svelte';

	import { getCategoryDatePath } from '$lib/url';
	import { approveAllPendingReservations } from '$lib/client/api';
	import { getYYYYMM } from '$lib/datetimeUtils';
	import { storedDayReservations_param, storedSettings, storedUser } from '$lib/client/stores';
	import type { SettingsManager } from '$lib/settings';

	// svelte-ignore unused-export-let
	export let params;
	export let data;

	$: day = data.day;
	$: storedDayReservations_param.set({ day });

	const category = 'classroom';

	let categories = [...CATEGORIES];

	function prevDay() {
		const prev = dayjs(day).subtract(1, 'day');
		goto(getCategoryDatePath(category, prev.format('YYYY-MM-DD')));
	}
	function nextDay() {
		const next = dayjs(day).add(1, 'day');
		goto(getCategoryDatePath(category, next.format('YYYY-MM-DD')));
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

	const resInfo = (sm: SettingsManager) => {
		const resources = sm.getClassrooms(day);
		const name = sm.getClassroomLabel(day);
		return { resources, name };
	};
</script>

{#if $storedUser}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>Classroom</label
			>
			<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each categories as cat}
					{#if cat !== category}
						<li>
							<a class="text-xl active:bg-gray-300" href={getCategoryDatePath(cat, day)}>
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
				{dayjs(day).format('MMMM DD, YYYY dddd')}
			</span>
		</div>
		<span class="mr-2">
			<Modal
				on:open={() => (modalOpened = true)}
				on:close={() => {
					modalOpened = false;
				}}><ReservationDialog {category} dateFn={() => day} /></Modal
			>
		</span>
	</div>
	<br />
	<div class="flex justify-between">
		<a
			class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700"
			href="/multi-day/classroom/{getYYYYMM(day)}"
		>
			<span><Chevron direction="left" /></span>
			<span class="xs:text-xl pb-1 whitespace-nowrap">month view</span>
		</a>

		{#if $viewMode === 'admin'}
			<button
				class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white"
				on:click={async () => {
					await approveAllPendingReservations(ReservationCategory.classroom, day);
				}}
			>
				Approve All
			</button>
		{/if}
	</div>
	<br />
	<div
		class="w-full min-h-[500px]"
		use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }}
		on:swipe={swipeHandler}
	>
		<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}>
			<DayHourly {category} resInfo={resInfo($storedSettings)} date={day} />
		</Modal>
	</div>
{/if}
