<script>
	import { swipe } from 'svelte-gestures';
	import { goto } from '$app/navigation';
	import DayHourly from '$lib/components/DayHourly.svelte';
	import DayOpenWater from '$lib/components/DayOpenWaterV2.svelte';
	import ReservationDialog from '$lib/components/ReservationDialog.svelte';
	import Chevron from '$lib/components/Chevron.svelte';
	import { datetimeToLocalDateStr, idx2month } from '$lib/datetimeUtils';
	import Modal from '$lib/components/Modal.svelte';
	import { loginState, stateLoaded, view, viewMode, viewedDate, reservations } from '$lib/stores';
	import { Settings } from '$lib/client/settings';
	import { CATEGORIES } from '$lib/constants.js';
	import { toast } from 'svelte-french-toast';

	export let data;

	let categories = [...CATEGORIES];

	const getBuoyState = (date, rsvs, viewMode) => {
		if (viewMode === 'admin') {
			rsvs = rsvs.filter((rsv) => {
				return (
					rsv.date === datetimeToLocalDateStr(date) &&
					rsv.category === 'openwater' &&
					['pending', 'confirmed'].includes(rsv.status)
				);
			});
			let auto = true;
			let notAuto = true;
			for (let rsv of rsvs) {
				if (rsv.buoy === 'auto') {
					notAuto = false;
				} else {
					auto = false;
				}
			}
			return auto ? 'unlocked' : notAuto ? 'locked' : 'mixed';
		} else {
			return null;
		}
	};
	$: buoyState = getBuoyState($viewedDate, $reservations, $viewMode);

	const highlightButton = (lock, buoyState) => {
		if ((lock && buoyState === 'locked') || (!lock && buoyState === 'unlocked')) {
			return 'bg-openwater-bg-to text-white';
		} else {
			return 'bg-root-bg-light dark:bg-root-bg-dark';
		}
	};

	$view = 'single-day';
	$: category = data.category;

	function multiDayView() {
		goto('/multi-day/{category}');
	}

	function prevDay() {
		let prev = new Date($viewedDate);
		prev.setDate($viewedDate.getDate() - 1);
		$viewedDate = prev;
	}
	function nextDay() {
		let next = new Date($viewedDate);
		next.setDate($viewedDate.getDate() + 1);
		$viewedDate = next;
	}

	function handleKeypress(e) {
		if (!modalOpened) {
			if (e.keyCode == 37) {
				// left arrow key
				prevDay();
			} else if (e.keyCode == 39) {
				// right arrow key
				nextDay();
			} else if (e.keyCode == 40) {
				// down arrow
				let i = categories.indexOf(category);
				i = (i + 1) % categories.length;
				goto(`/single-day/${categories[i]}`);
			} else if (e.keyCode == 38) {
				// up arrow
				let i = categories.indexOf(category);
				i = (categories.length + i - 1) % categories.length;
				goto(`/single-day/${categories[i]}`);
			}
		}
	}

	let modalOpened = false;

	function swipeHandler(event) {
		if (!modalOpened) {
			if (event.detail.direction === 'left') {
				nextDay();
			} else if (event.detail.direction === 'right') {
				prevDay();
			}
		}
	}

	const resInfo = () => {
		let dateStr = datetimeToLocalDateStr($viewedDate);
		let resources, name;
		if (category === 'pool') {
			resources = Settings.getPoolLanes(dateStr);
			name = Settings.getPoolLabel(dateStr);
		} else if (category === 'classroom') {
			resources = Settings.getClassrooms(dateStr);
			name = Settings.getClassroomLabel(dateStr);
		}
		return { resources, name };
	};

	const toggleBuoyLock = async (lock) => {
		const fn = async () => {
			let response = await fetch('/api/lockBuoyAssignments', {
				method: 'POST',
				headers: { 'Content-type': 'application/json' },
				body: JSON.stringify({
					lock,
					date: datetimeToLocalDateStr($viewedDate)
				})
			});
			let data = await response.json();
			if (data.status === 'success') {
				for (let rsv of data.reservations) {
					$reservations.filter((r) => r.id === rsv.id)[0].buoy = rsv.buoy;
				}
				$reservations = [...$reservations];
				return Promise.resolve();
			} else {
				console.error(data.error);
				return Promise.reject();
			}
		};
		toast.promise(fn(), {
			error: 'buoy lock failed'
		});
	};
	const lockBuoys = async () => toggleBuoyLock(true);
	const unlockBuoys = async () => toggleBuoyLock(false);
</script>

<svelte:window on:keydown={handleKeypress} />

{#if $stateLoaded && $loginState === 'in'}
	<div class="[&>*]:mx-auto flex items-center justify-between">
		<div class="dropdown h-8 mb-4">
			<label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown"
				>{category}</label
			>
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">
				{#each categories as cat}
					{#if cat !== category}
						<li>
							<a class="text-xl active:bg-gray-300" href="/single-day/{cat}">
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
				{idx2month[$viewedDate.getMonth()]}
				{$viewedDate.getDate()}
			</span>
		</div>
		<span class="mr-2">
			<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}
				><ReservationDialog
					{category}
					dateFn={(cat) => datetimeToLocalDateStr($viewedDate)}
				/></Modal
			>
		</span>
	</div>
	<br />
	<div class="flex justify-between">
		<a
			class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700"
			href="/multi-day/{category}"
		>
			<span><Chevron direction="left" /></span>
			<span class="xs:text-xl pb-1 whitespace-nowrap">month view</span>
		</a>
		{#if $viewMode === 'admin' && category === 'openwater'}
			<span>
				<button
					on:click={lockBuoys}
					class="{highlightButton(
						true,
						buoyState
					)} px-1 py-0 font-semibold border-black dark:border-white"
				>
					Lock
				</button>
				<button
					on:click={unlockBuoys}
					class="{highlightButton(
						false,
						buoyState
					)} px-1 py-0 font-semibold border-black dark:border-white"
				>
					Unlock
				</button>
			</span>
		{/if}
	</div>
	<br />
	<div
		class="w-full min-h-[500px]"
		use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }}
		on:swipe={swipeHandler}
	>
		<!-- // TODO: break apart this should be on separate pages 
			ie: /openwater/yyyy/mm/dd 
				/pool/yyyy/mm/dd
				/classroom/yyyy/mm/dd
			move ow first
		-->
		<Modal on:open={() => (modalOpened = true)} on:close={() => (modalOpened = false)}>
			{#if category === 'pool'}
				<DayHourly {category} resInfo={resInfo()} />
			{:else if category === 'classroom'}
				<DayHourly {category} resInfo={resInfo()} />
			{:else if category == 'openwater'}
				<DayOpenWater />
			{/if}
		</Modal>
	</div>
{/if}
