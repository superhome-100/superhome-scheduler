<script lang="ts">
	import { swipe } from 'svelte-gestures';
	import DayOfMonth from '$lib/components/DayOfMonth.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import { minValidDateStr } from '$lib/reservationTimes';
	import { getYYYYMM, getYYYYMMDD } from '$lib/datetimeUtils';
	import { CATEGORIES } from '$lib/constants';
	import type { ReservationCategory } from '$types';
	import { pushState } from '$app/navigation';
	import dayjs from 'dayjs';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import {
		isLoading,
		storedReservationsSummary,
		storedReservationsSummary_param,
		storedSettings,
		storedUser
	} from '$lib/client/stores';

	// svelte-ignore unused-export-let
	export let params;
	export let data;

	let categories = [...CATEGORIES];

	$: category = data.category as ReservationCategory;
	$: now = dayjs(data.month.substring(0, 7) + '-01');

	function getWeeksInMonth(year: number, month: number) {
		const startOfMonth = dayjs().year(year).month(month).startOf('month');
		const endOfMonth = startOfMonth.endOf('month');

		let date = startOfMonth.startOf('week');
		const weeks = [];

		while (date <= endOfMonth) {
			const days = Array(7)
				.fill(0)
				.map((_, i) => date.add(i, 'day'));
			weeks.push(days);
			date = date.add(1, 'week');
		}

		return weeks;
	}

	$: monthDates = getWeeksInMonth(now.get('year'), now.get('month'));

	$: {
		const firstWeek = monthDates[0];
		const lastWeek = monthDates[monthDates.length - 1];
		if (lastWeek.length > 0) {
			storedReservationsSummary_param.set({
				startDay: firstWeek[0].toDate(),
				endDay: lastWeek[lastWeek.length - 1].toDate()
			});
		}
	}

	function prevMonth() {
		now = now.subtract(1, 'month');
		pushState(`/multi-day/${category}/${getYYYYMM(now)}`, { showModal: false });
	}

	function nextMonth() {
		now = now.add(1, 'month');
		pushState(`/multi-day/${category}/${getYYYYMM(now)}`, { showModal: false });
	}

	let modalOpened = false;

	function handleKeypress(e) {
		const { tagName } = e.target;
		const isEditable = e.target.isContentEditable;

		// Filter out inputs, textareas, and contenteditable elements
		if (tagName === 'INPUT' || tagName === 'TEXTAREA' || isEditable) {
			return;
		}

		if (!modalOpened) {
			if (e.keyCode == 37) {
				// left arrow key
				prevMonth();
			} else if (e.keyCode == 39) {
				// right arrow key
				nextMonth();
			} else if (e.keyCode == 40) {
				// down arrow
				let i = categories.indexOf(category);
				i = (i + 1) % categories.length;
				category = categories[i] as ReservationCategory;
				pushState(`/multi-day/${category}/${getYYYYMM(now)}`, { showModal: false });
			} else if (e.keyCode == 38) {
				// up arrow
				let i = categories.indexOf(category);
				i = (categories.length + i - 1) % categories.length;
				category = categories[i] as ReservationCategory;
				pushState(`/multi-day/${category}/${getYYYYMM(now)}`, { showModal: false });
			} else if (e.keyCode == 84) {
				// letter 't'
				now = dayjs();
			}
		}
	}

	function swipeHandler(event) {
		if (!modalOpened) {
			if (event.detail.direction === 'left') {
				nextMonth();
			} else if (event.detail.direction === 'right') {
				prevMonth();
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeypress} />

{#if $isLoading}
	<LoadingBar />
{/if}
{#if $storedUser}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>{category}</label
			>
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each ['pool', 'openwater', 'classroom'] as cat}
					{#if cat !== category}
						<li>
							<a class="text-xl active:bg-gray-300" href="/multi-day/{cat}/{getYYYYMM(now)}">
								{cat}
							</a>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
		<div class="inline-flex items-center justify-between">
			<span on:click={prevMonth} on:keypress={prevMonth} class="cursor-pointer">
				<Chevron direction="left" svgClass="h-6 w-6" />
			</span>
			<span on:click={nextMonth} on:keypress={nextMonth} class="cursor-pointer">
				<Chevron direction="right" svgClass="h-6 w-6" />
			</span>
			<span class="text-2xl"
				>{now.format(now.year() === dayjs().year() ? 'MMMM' : 'MMMM YYYY')}</span
			>
		</div>
		<span class="">
			<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}
				><ReservationDialog
					{category}
					dateFn={(cat) => minValidDateStr($storedSettings, cat)}
				/></Modal
			>
		</span>
	</div>
	<div
		use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }}
		on:swipe={swipeHandler}
	>
		<table class="calendar table-fixed border-collapse w-full">
			<thead>
				<tr>
					<th>S</th>
					<th>M</th>
					<th>T</th>
					<th>W</th>
					<th>T</th>
					<th>F</th>
					<th>S</th>
				</tr>
			</thead>
			<tbody>
				{#each monthDates as week}
					<tr>
						{#each week as date}
							<td
								class={`border-${category}-bg-to align-top h-24 xs:h-24 border border-solid ${
									!date.isSame(now, 'month') && 'opacity-20 border-opacity-20'
								}`}
							>
								<DayOfMonth
									date={getYYYYMMDD(date)}
									{category}
									summary={$storedReservationsSummary[getYYYYMMDD(date)]}
								/>
							</td>
						{/each}
					</tr><tr />
				{/each}
			</tbody>
		</table>
	</div>
{/if}
