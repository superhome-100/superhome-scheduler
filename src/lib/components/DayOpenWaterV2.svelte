<script lang="ts">
	import { viewMode } from '$lib/stores';
	import { getContext } from 'svelte';
	import AdminComment from '$lib/components/AdminComment.svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import {
		type Buoy,
		type Submission,
		ReservationCategory,
		type OWReservation,
		type ReservationEx
	} from '$types';
	import DayOpenWaterSubmissionsCard from './DayOpenWaterSubmissionsCard.svelte';
	import { buoyDesc } from '$lib/utils';
	import { setBuoyToReservations } from '$lib/autoAssign';
	import {
		isLoading,
		storedBoatAssignments,
		storedBuoys,
		storedDaySettings,
		storedOWAdminComments
	} from '$lib/client/stores';
	import { ow_am_full } from '$lib/dateSettings';
	import type { SettingsManager } from '$lib/settingsManager';

	export let date: string;
	export let reservations: Reservation[];
	export let settingsManager: SettingsManager;

	$: isAmFull = $storedDaySettings[ow_am_full];
	$: boatAssignments = $storedBoatAssignments;

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs: ReservationEx[]) => {
		open(RsvTabs, {
			rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin'
		});
	};

	const showAdminCommentForm = (date: string, buoy: string) => {
		open(AdminComment, { date, buoy });
	};

	$: boats = settingsManager.getBoats(date);

	const saveAssignments = async (e) => {
		e.target.blur();
		let buoy = e.target.id.split('_')[0];
		let boat = e.target.value;
		if (boat === 'null') {
			boat = null;
		}

		const assignments = {
			...boatAssignments,
			[buoy]: boat
		};

		let response = await fetch('/api/admin/assignBuoysToBoats', {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			body: JSON.stringify({ date, assignments })
		});
		let data = await response.json();
		if (data.status !== 'success') {
			console.error('saveAssignments', data);
		}
	};

	const getHeadCount = (rsvs: Submission[]) => {
		return rsvs.reduce(
			(acc, rsv) => acc + (rsv.resType === 'course' ? (rsv.numStudents ?? 0) + 1 : 1),
			0
		);
	};

	type BuoyGrouping = {
		id: string;
		buoy: Buoy;
		boat?: string | null;
		amReservations?: OWReservation[];
		pmReservations?: OWReservation[];
		amAdminComment?: string;
		pmAdminComment?: string;
		amHeadCount: number;
		pmHeadCount: number;
	};
	$: buoyGroupings = ((): BuoyGrouping[] => {
		if (!reservations || !$storedBuoys.length) return [];
		const amReservations = setBuoyToReservations(
			$storedBuoys,
			reservations.filter((r) => r.owTime === 'AM') as OWReservation[]
		);
		const pmReservations = setBuoyToReservations(
			$storedBuoys,
			reservations.filter((r) => r.owTime === 'PM') as OWReservation[]
		);
		const comments = $storedOWAdminComments || [];
		return $storedBuoys
			.map((v) => {
				const amComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'AM');
				const pmComment = comments.find((c) => c.buoy === v.name && c.am_pm === 'PM');
				const buoyAmReservation = amReservations.filter((r) => r._buoy === v.name);
				const buoyPmReservation = pmReservations.filter((r) => r._buoy === v.name);
				return {
					id: `group_${v.name}`,
					buoy: v,
					boat: boatAssignments?.[v.name!] || null,
					amReservations: buoyAmReservation,
					pmReservations: pmReservations.filter((r) => r._buoy === v.name),
					amAdminComment: amComment?.comment ?? undefined,
					pmAdminComment: pmComment?.comment ?? undefined,
					// only AM headcount is necessary
					amHeadCount: getHeadCount(buoyAmReservation),
					pmHeadCount: getHeadCount(buoyPmReservation)
				};
			})
			.sort((a, b) => +(a.boat || 0) - +(b.boat || 0))
			.filter((v) => v.amReservations.length > 0 || v.pmReservations.length > 0);
	})();

	$: isAdmin = $viewMode === 'admin';
</script>

{#if $isLoading}
	<LoadingBar />
{/if}
{#if isAmFull}
	<header class="bg-[#FF0000] text-white p-2 rounded-md">
		Morning session is full please book in the afternoon instead.
	</header>
{/if}
{#if settingsManager.getOpenForBusiness(date) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else}
	<section class="w-full relative block">
		<header class="flex w-full gap-0.5 sm:gap-2 text-xs py-2">
			<div class="flex-none w-12 min-w-12">buoy</div>
			<div class="flex-none text-center" class:w-20={isAdmin} class:w-8={!isAdmin}>boat</div>
			<div class="grow text-center">
				<span>AM Count</span>

				{#if $viewMode === 'admin'}
					<div
						class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
					>
						{#each boats as boat}
							<span class="font-bold ml-1">{boat}</span>
							<span class=" bg-teal-100 border border-black px-0.5"
								>{buoyGroupings
									.filter((b) => b.boat === boat)
									.reduce((a, b) => a + b.amHeadCount, 0)}</span
							>
						{/each}
					</div>
				{/if}
			</div>
			<div class="grow text-center">
				<span>PM Count</span>

				{#if $viewMode === 'admin'}
					<div
						class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
					>
						{#each boats as boat}
							<span class="font-bold ml-1">{boat}</span>
							<span class=" bg-teal-100 border border-black px-0.5"
								>{buoyGroupings
									.filter((b) => b.boat === boat)
									.reduce((a, b) => a + b.pmHeadCount, 0)}</span
							>
						{/each}
					</div>
				{/if}
			</div>
		</header>
		<ul class="flex flex-col gap-0.5 sm:gap-3">
			{#each buoyGroupings as grouping (grouping.id)}
				<li
					class="flex items-center w-full gap-0.5 sm:gap-2 border-b-[1px] border-gray-200 border-opacity-20 pb-0.5 sm:pb-2"
				>
					<div class="flex-none w-12 min-w-12">
						<button
							type="button"
							class="cursor-pointer font-semibold text-left p-0 border-none bg-transparent block w-full"
							on:click={() => isAdmin && showAdminCommentForm(date, grouping.buoy.name)}
						>
							<span>{grouping.buoy.name}</span>
							<br />
							<span class="text-xs">{buoyDesc(grouping.buoy)}</span>
						</button>
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
								<option value="null">-</option>
								{#each boats as boat}
									<option value={boat}>{boat}</option>
								{/each}
							</select>
						{:else}
							{grouping.boat || '-'}
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
