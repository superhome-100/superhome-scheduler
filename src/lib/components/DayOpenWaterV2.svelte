<script lang="ts">
	import { viewMode } from '$lib/stores';
	import { getContext } from 'svelte';
	import AdminComment from '$lib/components/AdminComment.svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import {
		type Buoy,
		type Submission,
		type OWReservation,
		type ReservationEx,
		ReservationCategory
	} from '$types';
	import DayOpenWaterSubmissionsCard from './DayOpenWaterSubmissionsCard.svelte';
	import { buoyDesc, isOpenForBooking } from '$lib/utils';
	import { setBuoyToReservations } from '$lib/autoAssign';
	import {
		isLoading,
		storedBoatAssignments,
		storedBuoys,
		storedOWAdminComments,
		storedSettings
	} from '$lib/client/stores';
	import toast from 'svelte-french-toast';
	import { assignBuoysToBoats } from '$lib/client/api';

	export let date: string;
	export let reservations: ReservationEx[];
	export let isAmFull: boolean;

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

	$: boats = $storedSettings.getBoats(date);

	const saveAssignments = async (e: any) => {
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

		await assignBuoysToBoats(date, assignments);
	};

	const getHeadCount = (rsvs: Submission[]) => {
		return rsvs.reduce((acc, rsv) => acc + (rsv.numStudents ?? 0) + 1, 0);
	};

	type BuoyGrouping = {
		id: string;
		buoy: Buoy;
		boat?: string | null;
		amReservations: OWReservation[];
		pmReservations: OWReservation[];
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
	$: isOpen = isOpenForBooking($storedSettings, date, ReservationCategory.openwater, null);
	$: isAMOpen = $storedSettings.getOpenwaterAmBookable(date);
	$: isPMOpen = $storedSettings.getOpenwaterPmBookable(date);
</script>

{#if $isLoading}
	<LoadingBar />
{/if}
{#if !isOpen}
	<div class="font-semibold text-3xl text-center">🔒 Closed</div>
{/if}
{#if isOpen || isAdmin}
	<section class="w-full relative block">
		<header
			class="flex w-full gap-0.5 sm:gap-2 py-2"
			style="padding-bottom: 1rem; margin-bottom: 1rem; border-bottom: solid;"
		>
			<div class="flex-none w-12 min-w-12">buoy</div>
			<div class="flex-none text-center" class:w-20={isAdmin} class:w-8={!isAdmin}>boat</div>
			<div class="grow text-center justify-items-center">
				<span>AM</span><span class="desktop-text">&nbsp;Session</span>
				{#if !isAMOpen}
					<span class="bg-[#565843] text-white p-2 rounded-md">is closed 🔒</span>
				{:else if isAmFull}
					<span class="bg-[#FF0000] text-white p-2 rounded-md">is full</span>
				{/if}
				{#if $viewMode === 'admin'}
					<div
						class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
						style="margin-top: 0.5rem;"
					>
						<span class="desktop-text">Boats:</span>
						{#each boats as boat}
							<span class="font-bold ml-1">{boat}</span>
							<span class="bg-teal-100 border border-black px-0.4"
								>{buoyGroupings
									.filter((b) => b.boat === boat)
									.reduce((a, b) => a + b.amHeadCount, 0)}</span
							>
						{/each}
					</div>
				{/if}
			</div>
			<div class="grow text-center justify-items-center">
				<span>PM</span><span class="desktop-text">&nbsp;Session</span>
				{#if !isPMOpen}
					<span class="bg-[#565843] text-white p-2 rounded-md">is closed 🔒</span>
				{/if}
				{#if $viewMode === 'admin'}
					<div
						class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1"
						style="margin-top: 0.5rem;"
					>
						<span class="desktop-text">Boats:</span>
						{#each boats as boat}
							<span class="font-bold ml-1">{boat}</span>
							<span class="bg-teal-100 border border-black px-0.4"
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
							class="cursor-pointer font-semibold text-center p-0 border-none bg-transparent block w-full"
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
								class="boat_select text-sm h-8 w-8 xs:text-xl xs:h-8 xs:w-8 text-center"
								name={grouping.buoy.name + '_boat'}
								id={grouping.buoy.name + '_boat'}
								bind:value={grouping.boat}
								on:input={async (e) => {
									toast
										.promise(saveAssignments(e), {
											loading: 'Changing boat assignments...',
											success: 'Changed boat assignments',
											error: 'Failed changing boat assignments'
										})
										.catch((e) => console.warn('boat-assignment', grouping.buoy.name));
								}}
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

<style>
	.boat_select {
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
		padding: 0px;
		padding-right: 2px;
		background: transparent;
		text-align: center;
		text-align-last: center;
		border-radius: none;
	}
</style>
