<script lang="ts">
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import DayOfMonth from '$lib/components/DayOfMonth.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import { minValidDateStr } from '$lib/reservationTimes';
	import { getYYYYMMDD, idx2month } from '$lib/datetimeUtils';
	import { view, loginState, stateLoaded } from '$lib/stores';
	import { CATEGORIES } from '$lib/constants.js';
	import { Settings } from '$lib/client/settings';
	import type { ReservationCategory, DateReservationSummary } from '$types';
	import { getReservationSummary } from '$lib/api';
	import { auth } from '$lib/firebase';

	import dayjs from 'dayjs';
	import LoadingBar from '$lib/components/LoadingBar.svelte';

	export let data: {
		category: ReservationCategory;
	};

	let categories = [...CATEGORIES];

	$view = 'multi-day';

	let now = dayjs();
	let isLoading = false;

	function getWeeksInMonth(year: number = now.year(), month: number = now.month()) {
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

	let datesSummary: Record<string, DateReservationSummary> = {};

	function prevMonth() {
		now = now.subtract(1, 'month');
	}

	function nextMonth() {
		now = now.add(1, 'month');
	}

	let modalOpened = false;

	function handleKeypress(e) {
		if (!modalOpened) {
			if (e.keyCode == 37) {
				// left arrow key
				prevMonth();
			} else if (e.keyCode == 39) {
				// right arrow key
				nextMonth();
			} else if (e.keyCode == 40) {
				// down arrow
				let i = categories.indexOf(data.category);
				i = (i + 1) % categories.length;
				goto(`/multi-day/${categories[i]}`);
			} else if (e.keyCode == 38) {
				// up arrow
				let i = categories.indexOf(data.category);
				i = (categories.length + i - 1) % categories.length;
				goto(`/multi-day/${categories[i]}`);
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

	const loadSummary = async () => {
		if (monthDates.length) {
			isLoading = true;
			const firstWeek = monthDates[0];
			const lastWeek = monthDates[monthDates.length - 1];
			const data = await getReservationSummary(
				firstWeek[0].toDate(),
				lastWeek[lastWeek.length - 1].toDate()
			);
			if (data && data.status === 'success') {
				datesSummary = {
					...datesSummary,
					...data.summary
				};
			}
			isLoading = false;
		}
	};

	$: {
		auth.authStateReady().then(() => {
			monthDates.length && loadSummary();
		});
	}
</script>

<svelte:window on:keydown={handleKeypress} />

{#if isLoading}
	<LoadingBar />
{/if}
{#if $stateLoaded && $loginState === 'in'}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>{data.category}</label
			>
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each ['pool', 'openwater', 'classroom'] as cat}
					{#if cat !== data.category}
						<li>
							<a class="text-xl active:bg-gray-300" href="/multi-day/{cat}">
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
			<span class="text-2xl">{idx2month[now.get('month')]}</span>
		</div>
		<span class="">
			<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}
				><ReservationDialog
					category={data.category}
					dateFn={(cat) => minValidDateStr(Settings, cat)}
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
								class={`border-${data.category}-bg-to align-top h-20 xs:h-24 border border-solid ${
									!date.isSame(now, 'month') && 'opacity-20 border-opacity-20'
								}`}
							>
								<DayOfMonth
									date={date.toDate()}
									category={data.category}
									summary={datesSummary[getYYYYMMDD(date)]}
								/>
							</td>
						{/each}
					</tr><tr />
				{/each}
			</tbody>
		</table>
	</div>
{/if}
