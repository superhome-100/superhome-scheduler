<script lang="ts">
	import {
		adminComments,
		buoys,
		boatAssignments,
		reservations,
		profileSrc,
		viewMode,
		viewedDate
	} from '$lib/stores';
	import { datetimeToLocalDateStr as dtToLDS } from '$lib/datetimeUtils';
	import { assignRsvsToBuoys } from '$lib/autoAssign';
	import { getContext, onMount } from 'svelte';
	import AdminComment from '$lib/components/AdminComment.svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import { Settings } from '$lib/client/settings';
	import { getOWAdminComments } from '$lib/api';
	import type { Buoy, Reservation, Submission } from '$types';
	import DayOpenWaterSubmissionsCard from './DayOpenWaterSubmissionsCard.svelte';
	import { buoyDesc } from '$lib/utils';

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs: Submission[]) => {
		open(RsvTabs, {
			rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin'
		});
	};

	const showAdminCommentForm = (date, buoy) => {
		open(AdminComment, { date, buoy });
	};

	function getOpenWaterSchedule(rsvs: Reservation[], datetime: Date) {
		type Assignment = Record<string, Submission[]>;
		let schedule: Record<'AM' | 'PM', Assignment> = {
			AM: {},
			PM: {}
		};
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
			// what happened to result.unsassigned?
			schedule[owTime as 'AM' | 'PM'] = result.assignments;
		}

		return schedule;
	}

	$: schedule = getOpenWaterSchedule($reservations, $viewedDate);

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
	$: boats = Settings.getBoats(date);
	$: displayBuoys = sortByBoat($buoys, $boatAssignments[date]);

	const loadAdminComments = async () => {
		if (date) {
			$adminComments[date] = await getOWAdminComments(date);
			$adminComments = { ...$adminComments };
		} else {
			$adminComments[date] = [];
		}
	};
	$: {
		$viewedDate && loadAdminComments();
	}
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

	const boatCountPos = (profileSrc) => {
		if (profileSrc != null) {
			return 'top-[50px] sm:top-[120px] md:top-[110px]';
		} else {
			return 'top-[100px] xs:top-[110px] lg:top-[100px]';
		}
	};

	onMount(() => {
		loadAdminComments();
	});

	type BuoyGrouping = {
		buoy: Buoy;
		boat?: string | null;
		amReservations?: Submission[];
		pmReservations?: Submission[];
		amAdminComment?: string;
		pmAdminComment?: string;
	};
	let buoyGroupings: BuoyGrouping[] = [];

	$: {
		const today = dtToLDS($viewedDate);
		const todayFilter = (r: Submission) =>
			r.date === today && r.category === 'openwater' && ['pending', 'confirmed'].includes(r.status);
		const todaysReservations = $reservations.filter(todayFilter);
		const comments = $adminComments[today] || [];
		buoyGroupings = $buoys
			.map((v) => {
				const amComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'AM');
				const pmComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'PM');
				return {
					buoy: v,
					boat: $boatAssignments[today]?.[v.name!],
					amReservations: todaysReservations.filter((r) => r.owTime === 'AM' && r.buoy === v.name),
					pmReservations: todaysReservations.filter((r) => r.owTime === 'PM' && r.buoy === v.name),
					amAdminComment: amComment?.comment,
					pmAdminComment: pmComment?.comment
				};
			})
			.filter((v) => v.amReservations.length > 0 || v.pmReservations.length > 0);

		console.log(buoyGroupings);
	}
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
{#if Settings.getOpenForBusiness(dtToLDS($viewedDate)) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else}
	<section class="w-full relative block">
		<header class="flex w-full gap-2 text-xs py-2">
			<div class="flex-none w-12 min-w-12">buoy</div>
			<div class="flex-none w-20  text-center" class:w-16={$viewMode === 'admin'}>boat</div>
			<div class="grow text-center">AM</div>
			<div class="grow text-center">PM</div>
		</header>
		<ul class="flex flex-col gap-3">
			{#each buoyGroupings as grouping}
				<li class="flex w-full gap-2 border-b-[1px] border-gray-200 border-opacity-20 pb-2">
					<div class="flex-none w-12 min-w-12">
						{#if $viewMode === 'admin'}
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<div
								class="cursor-pointer font-semibold"
								on:click={() => showAdminCommentForm(date, grouping.buoy)}
							>
								<span class="text-xl">{grouping.buoy.name}</span>
								<br />
								<span class="text-xs">{buoyDesc(grouping.buoy)}</span>
							</div>
						{:else}
							<div class="flex items-center justify-center font-semibold">
								{grouping.buoy.name}
							</div>
						{/if}
					</div>
					<div class="flex-none w-20 min-w-20 px-2 text-center" class:w-16={$viewMode === 'admin'}>
						{#if $viewMode === 'admin'}
							<select
								class="text-sm h-6 w-16 xs:text-xl xs:h-8 xs:w-16"
								name={grouping.buoy.name + '_boat'}
								id={grouping.buoy.name + '_boat'}
								value={grouping.boat}
								on:input={saveAssignments}
							>
								<option value="null" />
								{#each boats as boat}
									<option value={boat}>{boat}</option>
								{/each}
							</select>
						{:else}
							{grouping.boat || 'UNASSIGNED'}
						{/if}
					</div>
					<div class="grow flex w-auto relative gap-2">
						<div class="w-1/2">
							<DayOpenWaterSubmissionsCard
								submissions={grouping.amReservations || []}
								onClick={() => {
									showViewRsvs(grouping.amReservations || []);
								}}
								adminComment={grouping.amAdminComment}
							/>
						</div>
						<div class="w-1/2">
							<DayOpenWaterSubmissionsCard
								submissions={grouping.pmReservations || []}
								onClick={() => {
									console.log('event');
									showViewRsvs(grouping.amReservations || []);
								}}
								adminComment={grouping.pmAdminComment}
							/>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}
