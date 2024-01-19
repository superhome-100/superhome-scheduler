<script lang="ts">
	import {
		adminComments,
		buoys,
		boatAssignments,
		reservations,
		viewMode,
		viewedDate
	} from '$lib/stores';
	import { datetimeToLocalDateStr as dtToLDS } from '$lib/datetimeUtils';
	import { getContext, onMount } from 'svelte';
	import AdminComment from '$lib/components/AdminComment.svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import { Settings } from '$lib/client/settings';
	import { getOWAdminComments } from '$lib/api';
	import type { Buoy, Submission } from '$types';
	import DayOpenWaterSubmissionsCard from './DayOpenWaterSubmissionsCard.svelte';
	import { buoyDesc } from '$lib/utils';
	import { setBuoyToReservations } from '$lib/autoAssign';

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs: Submission[]) => {
		open(RsvTabs, {
			rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin'
		});
	};

	const showAdminCommentForm = (date: string, buoy: string) => {
		open(AdminComment, { date, buoy });
	};

	$: date = dtToLDS($viewedDate);
	$: boats = Settings.getBoats(date);

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
			console.log('succesful boat buoy assignment update');
			$boatAssignments[date] = JSON.parse(data.record.assignments);
			$boatAssignments = { ...$boatAssignments };
		}
	};

	onMount(() => {
		loadAdminComments();
	});

	type BuoyGrouping = {
		id: string;
		buoy: Buoy;
		boat?: string | null;
		amReservations?: Submission[];
		pmReservations?: Submission[];
		amAdminComment?: string;
		pmAdminComment?: string;
		headCount: number;
	};
	let buoyGroupings: BuoyGrouping[] = [];

	const getHeadCount = (rsvs: Submission[]) => {
		return rsvs.reduce((acc, rsv) => acc + (rsv.resType === 'course' ? rsv.numStudents + 1 : 1), 0);
	};

	$: {
		// TODO: refactor looks expensive, might be an issue if there are a ton of reservations
		// eventually todayFilter should be eliminated if its possible to just get from store reservations limited for today and of type ow only
		const today = dtToLDS($viewedDate);
		const todayFilter = (r: Submission) =>
			r.date === today && r.category === 'openwater' && ['pending', 'confirmed'].includes(r.status);
		const initialReservations = $reservations.filter(todayFilter) as Submission[];

		const amReservations = setBuoyToReservations(
			$buoys,
			initialReservations.filter((r) => r.owTime === 'AM')
		);
		const pmReservations = setBuoyToReservations(
			$buoys,
			initialReservations.filter((r) => r.owTime === 'PM')
		);

		const comments = $adminComments[today] || [];
		buoyGroupings = [...$buoys]
			.map((v) => {
				const amComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'AM');
				const pmComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'PM');
				const buoyAmReservation = amReservations.filter((r) => r._buoy === v.name);
				return {
					id: `group_${v.name}`,
					buoy: v,
					boat: $boatAssignments[today]?.[v.name!] || null,
					amReservations: buoyAmReservation,
					pmReservations: pmReservations.filter((r) => r._buoy === v.name),
					amAdminComment: amComment?.comment,
					pmAdminComment: pmComment?.comment,
					// only AM headcount is necessary
					headCount: getHeadCount(buoyAmReservation)
				};
			})
			.sort((a, b) => +(a.boat || 0) - +(b.boat || 0))
			.filter((v) => v.amReservations.length > 0 || v.pmReservations.length > 0);
	}

	$: isAdmin = $viewMode === 'admin';
</script>

{#if $viewMode === 'admin'}
	<div
		class="fixed sm:text-xl left-1/2 lg:left-2/3 -translate-x-1/2 whitespace-nowrap w-fit top-[50px] sm:top-[120px] md:top-[110px] opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
	>
		<span>boat counts:</span>
		{#each boats as boat}
			<span class="font-bold">{boat}</span>
			<span class="me-2 bg-teal-100 border border-black px-0.5"
				>{buoyGroupings.filter((b) => b.boat === boat).reduce((a, b) => a + b.headCount, 0)}</span
			>
		{/each}
	</div>
{/if}
{#if Settings.getOpenForBusiness(dtToLDS($viewedDate)) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else}
	<section class="w-full relative block">
		<header class="flex w-full gap-0.5 sm:gap-2 text-xs py-2">
			<div class="flex-none w-12 min-w-12">buoy</div>
			<div class="flex-none text-center" class:w-20={isAdmin} class:w-8={!isAdmin}>boat</div>
			<div class="grow text-center">AM</div>
			<div class="grow text-center">PM</div>
		</header>
		<ul class="flex flex-col gap-0.5 sm:gap-3">
			{#each buoyGroupings as grouping (grouping.id)}
				<li
					class="flex items-center w-full gap-0.5 sm:gap-2 border-b-[1px] border-gray-200 border-opacity-20 pb-0.5 sm:pb-2"
				>
					<div class="flex-none w-12 min-w-12">
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<div
							class="cursor-pointer font-semibold"
							on:click={() => isAdmin && showAdminCommentForm(date, grouping.buoy.name)}
						>
							<span>{grouping.buoy.name}</span>
							<br />
							<span class="text-xs">{buoyDesc(grouping.buoy)}</span>
						</div>
					</div>
					<div class="flex-none px-2 text-center" class:w-20={isAdmin} class:w-8={!isAdmin}>
						{#if $viewMode === 'admin'}
							<select
								class="text-sm h-6 w-16 xs:text-xl xs:h-8 xs:w-16"
								name={grouping.buoy.name + '_boat'}
								id={grouping.buoy.name + '_boat'}
								bind:value={grouping.boat}
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
					<div class="grow flex w-auto relative gap-0.5 sm:gap-2">
						<div class="w-1/2">
							<DayOpenWaterSubmissionsCard
								submissions={grouping.amReservations || []}
								onClick={() => {
									showViewRsvs(grouping.amReservations || []);
								}}
								adminComment={grouping.amAdminComment}
								adminView={isAdmin}
							/>
						</div>
						<div class="w-1/2">
							<DayOpenWaterSubmissionsCard
								submissions={grouping.pmReservations || []}
								onClick={() => {
									showViewRsvs(grouping.pmReservations || []);
								}}
								adminComment={grouping.pmAdminComment}
								adminView={isAdmin}
							/>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}
