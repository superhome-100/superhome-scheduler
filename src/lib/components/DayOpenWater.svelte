<script>
	import {
		buoys,
		boatAssignments,
		reservations,
		profileSrc,
		user,
		viewMode,
		viewedDate
	} from '$lib/stores.js';
	import { datetimeToLocalDateStr as dtToLDS } from '$lib/datetimeUtils.js';
	import { displayTag } from '$lib/utils.js';
	import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
	import { getContext } from 'svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import { badgeColor, buoyDesc } from '$lib/utils.js';
	import { Settings } from '$lib/settings.js';

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs) => {
		open(RsvTabs, {
			rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin'
		});
	};

	function getOpenWaterSchedule(rsvs, datetime) {
		let schedule = {};
		let today = dtToLDS(datetime);
		rsvs = rsvs.filter(
			(v) =>
				v.date === today &&
				v.category === 'openwater' &&
				['pending', 'confirmed'].includes(v.status)
		);
		for (let owTime of ['AM', 'PM']) {
			let result = assignRsvsToBuoys(
				$buoys,
				rsvs.filter((rsv) => rsv.owTime === owTime)
			);
			schedule[owTime] = result.assignments;
		}

		return schedule;
	}

	$: schedule = getOpenWaterSchedule($reservations, $viewedDate);

	const heightUnit = 2; //rem
	const blkMgn = 0.25; // dependent on tailwind margin styling

	$: rowHeights = $buoys.reduce((o, b) => {
		let nRes = Math.max(
			schedule.AM[b.name] ? schedule.AM[b.name].length : 0,
			schedule.PM[b.name] ? schedule.PM[b.name].length : 0
		);
		o[b.name] = {
			header: nRes * heightUnit,
			buoy: nRes * heightUnit - blkMgn,
			margins: [...Array(nRes).keys()].map((idx) => {
				const outer = (nRes * heightUnit - blkMgn - 1.25 * nRes) / 2;
				let top, btm;
				if (idx == 0) {
					top = outer;
					btm = 0;
				} else if (idx == nRes - 1) {
					top = 0;
					btm = outer;
				} else {
					top = 0;
					btm = 0;
				}
				return top + 'rem 0 ' + btm + 'rem 0';
			})
		};
		return o;
	}, {});

	const rsvClass = (rsv) => {
		if (rsv.user.id === $user.id) {
			return 'border border-transparent rounded-2xl bg-lime-300 text-black';
		} else {
			return '';
		}
	};

	const buoyInUse = (sched, b) => sched.AM[b] != undefined || sched.PM[b] != undefined;

	const sortByBoat = (buoys, asn) => {
		let sorted = [...buoys];
		if (asn != null) {
			sorted.sort((a, b) => {
				if (asn[a.name] && asn[a.name] !== 'null') {
					if (asn[b.name] && asn[b.name] !== 'null') {
						if (parseInt(asn[a.name]) > parseInt(asn[b.name])) {
							return 1;
						} else {
							return -1;
						}
					} else {
						return 1;
					}
				} else if (asn[b.name] && asn[b.name] !== 'null') {
					return -1;
				} else {
					return 0;
				}
			});
		}
		return sorted;
	};

	$: date = dtToLDS($viewedDate);
	$: boats = Settings.get('boats', date);
	$: boatCounts = boats.reduce((bc, b) => {
		bc[b] = 0;
		return bc;
	}, {});
	$: displayBuoys = sortByBoat($buoys, $boatAssignments[date]);

	const displayValue = (buoy) => {
		if ($boatAssignments[date] === undefined) {
			$boatAssignments[date] = {};
		}
		if ($boatAssignments[date][buoy] === undefined) {
			$boatAssignments[date][buoy] = null;
		}
		return $boatAssignments[date][buoy];
	};

	const getBoatCount = (schedule, assignments, boat) => {
		let count = 0;
		if (assignments != null) {
			for (let buoy in assignments) {
				if (schedule.AM[buoy] && assignments[buoy] === boat) {
					for (let rsv of schedule.AM[buoy]) {
						count++;
						if (rsv.resType === 'course') {
							count += rsv.numStudents;
						}
					}
				}
			}
		}
		return count;
	};

	const saveAssignments = async (e) => {
		e.target.blur();
		let buoy = e.target.id.split('_')[0];
		let boat = e.target.value;
		if (boat === 'null') {
			boat = null;
		}
		if ($boatAssignments[date] == null) {
			$boatAssignments[date] = {};
		}
		$boatAssignments[date][buoy] = boat;

		let response = await fetch('/api/assignBuoysToBoats', {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			body: JSON.stringify({ date, assignments: $boatAssignments[date] })
		});
		let data = await response.json();
		if (data.status === 'success') {
			$boatAssignments[date] = JSON.parse(data.record.assignments);
			$boatAssignments = { ...$boatAssignments };
		}
	};

	$: owTimeColWidth = () => ($viewMode === 'admin' ? 'w-[33%]' : 'w-[42%]');

	const boatCountPos = (profileSrc) => {
		if (profileSrc != null) {
			return 'top-[50px] sm:top-[120px] md:top-[110px]';
		} else {
			return 'top-[100px] xs:top-[110px] lg:top-[100px]';
		}
	};
</script>

{#if $viewMode === 'admin'}
	<div
		class="fixed sm:text-xl left-1/2 lg:left-2/3 -translate-x-1/2 whitespace-nowrap w-fit {boatCountPos(
			$profileSrc
		)} opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
	>
		<span>boat counts:</span>
		{#each boats as boat}
			<span class="font-bold">{boat}</span>
			<span class="me-2 bg-teal-100 border border-black px-0.5"
				>{getBoatCount(schedule, $boatAssignments[date], boat)}</span
			>
		{/each}
	</div>
{/if}
{#if Settings.get('openForBusiness', dtToLDS($viewedDate)) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else}
	<div class="row">
		<div class="column text-center w-[16%]">
			<div class="font-semibold">buoy</div>
			{#each displayBuoys as buoy (buoy.name)}
				{#if buoyInUse(schedule, buoy.name)}
					{#if $viewMode === 'admin'}
						<div
							class="flex mx-2 sm:mx-4 md:mx-8 lg:mx-6 xl:mx-12 items-center justify-between font-semibold"
							style="height: {rowHeights[buoy.name].header}rem"
						>
							<span class="text-xl">{buoy.name}</span>
							<span class="text-sm">{buoyDesc(buoy)}</span>
						</div>
					{:else}
						<div
							class="flex items-center justify-center font-semibold"
							style="height: {rowHeights[buoy.name].header}rem"
						>
							{buoy.name}
						</div>
					{/if}
				{/if}
			{/each}
		</div>
		{#if $viewMode === 'admin'}
			<div class="column text-center w-[18%]">
				<div class="font-semibold">boat</div>
				{#each displayBuoys as buoy (buoy.name)}
					{#if buoyInUse(schedule, buoy.name)}
						<div
							class="flex items-center justify-center"
							style="height: {rowHeights[buoy.name].header}rem"
						>
							<select
								class="text-sm h-6 w-16 xs:text-xl xs:h-8 xs:w-16"
								name={buoy.name + '_boat'}
								id={buoy.name + '_boat'}
								value={displayValue(buoy.name)}
								on:input={saveAssignments}
							>
								<option value="null" />
								{#each boats as boat}
									<option value={boat}>{boat}</option>
								{/each}
							</select>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		{#each [{ cur: 'AM', other: 'PM' }, { cur: 'PM', other: 'AM' }] as { cur, other }}
			<div class="column text-center {owTimeColWidth()}">
				<div class="font-semibold">{cur}</div>
				{#each displayBuoys as { name }}
					{#if schedule[cur][name] != undefined}
						<div
							class="rsv whitespace-nowrap rounded-2xl overflow-hidden cursor-pointer openwater text-sm mb-1 mt-0.5"
							style="height: {rowHeights[name].buoy}rem"
							on:click={showViewRsvs(schedule[cur][name])}
						>
							{#each schedule[cur][name] as rsv, i}
								<div class="block indicator w-full px-2">
									<span class="rsv-indicator {badgeColor([rsv])}" />
									<div
										class="overflow-hidden {rsvClass(rsv)}"
										style="margin: {rowHeights[name].margins[i]}"
									>
										{displayTag(rsv, $viewMode === 'admin')}
									</div>
								</div>
							{/each}
						</div>
					{:else if schedule[other][name] != undefined}
						<div style="height: {rowHeights[name].header}rem" />
					{/if}
				{/each}
			</div>
		{/each}
	</div>
{/if}
