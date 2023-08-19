<script>
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import { monthArr } from '$lib/utils.js';
	import DayOfMonth from '$lib/components/DayOfMonth.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import { minValidDateStr } from '$lib/reservationTimes.js';
	import { idx2month } from '$lib/datetimeUtils';
	import { view, viewedMonth, reservations, loginState, stateLoaded } from '$lib/stores';
	import { CATEGORIES } from '$lib/constants.js';
	import { Settings } from '$lib/settings.js';

	export let data;

	let categories = [...CATEGORIES];

	$view = 'multi-day';

	$: gCategory = data.category;
	$: gMonth = $viewedMonth.getMonth();
	$: gYear = $viewedMonth.getFullYear();
	$: gMonthArr = () =>
		monthArr(
			gYear,
			gMonth,
			$reservations.filter((rsv) => rsv.category === gCategory)
		);

	function handleDateChange() {
		$viewedMonth = new Date(gYear, gMonth, 1);
	}

	function prevMonth() {
		if (gMonth == 0) {
			gYear = gYear - 1;
			gMonth = 11;
		} else {
			gMonth = gMonth - 1;
		}
		handleDateChange();
	}

	function nextMonth() {
		if (gMonth == 11) {
			gYear = gYear + 1;
			gMonth = 0;
		} else {
			gMonth = gMonth + 1;
		}
		handleDateChange();
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
				let i = categories.indexOf(gCategory);
				i = (i + 1) % categories.length;
				goto(`/multi-day/${categories[i]}`);
			} else if (e.keyCode == 38) {
				// up arrow
				let i = categories.indexOf(gCategory);
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
	const catStyle = (cat) => {
		return cat === 'pool'
			? 'border-pool-bg-to'
			: cat === 'openwater'
			? 'border-openwater-bg-to'
			: cat === 'classroom'
			? 'border-classroom-bg-to'
			: undefined;
	};
</script>

<svelte:window on:keydown={handleKeypress} />

{#if $stateLoaded && $loginState === 'in'}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>{gCategory}</label
			>
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each ['pool', 'openwater', 'classroom'] as cat}
					{#if cat !== gCategory}
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
			<span class="text-2xl">{idx2month[gMonth]}</span>
		</div>
		<span class="">
			<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}
				><ReservationDialog
					category={gCategory}
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
				{#each gMonthArr() as week}
					<tr>
						{#each week as { date, rsvs }}
							<td class="{catStyle(gCategory)} align-top h-20 xs:h-24 border border-solid">
								<DayOfMonth {date} category={gCategory} {rsvs} />
							</td>
						{/each}
					</tr><tr />
				{/each}
			</tbody>
		</table>
	</div>
{/if}
