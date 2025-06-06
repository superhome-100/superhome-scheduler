<script lang="ts">
	import { startTimes, endTimes } from '$lib/reservationTimes';
	import { users, viewMode } from '$lib/stores';
	import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils';
	import { getContext } from 'svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import { badgeColor, getDaySchedule } from '$lib/utils';
	import { Settings } from '$lib/client/settings';
	import LoadingBar from './LoadingBar.svelte';

	import { getReservationsByDate } from '$lib/api';
	import { ReservationCategory } from '$types';

	export let resInfo;
	export let category: 'pool' | 'classroom';
	export let date: string;
	export let refreshTs = Date.now();

	let reservations: Reservation[] = [];
	let isLoading = false;

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs) => {
		open(RsvTabs, {
			rsvs: rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin',
			onSubmit: () => {
				loadReservations();
			}
		});
	};
	$: assignment = getDaySchedule(reservations, date, category);

	const rowHeight = 3;
	const blkMgn = 0.25; // dependent on tailwind margin styling

	const slotsPerHr = (date, category) => {
		let st = startTimes(Settings, date, category);
		let et = endTimes(Settings, date, category);
		let beg = st[0];
		let end = et[et.length - 1];
		let totalMin = timeStrToMin(end) - timeStrToMin(beg);
		let sph = 60 / (totalMin / st.length);
		return sph;
	};

	$: slotDiv = slotsPerHr(datetimeToLocalDateStr(date), category);

	const displayTimes = (date, category) => {
		let dateStr = datetimeToLocalDateStr(date);
		let st = startTimes(Settings, dateStr, category);
		let et = endTimes(Settings, dateStr, category);
		let hrs = [];
		for (let i = 0; i < st.length; i++) {
			if (i % slotDiv == 0) {
				hrs.push(st[i]);
			}
		}
		hrs.push(et[et.length - 1]);
		return hrs;
	};

	const formatTag = (rsvs, nSlots, width, slotWidthPx) => {
		let tag = '';
		if (rsvs[0].resType === 'course') {
			let nickname = $users[rsvs[0].user.id].nickname;
			tag = nickname + ' +' + rsvs[0].numStudents;
		} else {
			for (let i = 0; i < rsvs.length; i++) {
				let nickname = $users[rsvs[i].user.id].nickname;
				tag += nickname;
				if (i < rsvs.length - 1) {
					tag += ' and ';
				}
			}
		}
		let lines = [];
		let start = 0;
		for (let i = 0; i < nSlots; i++) {
			let pxPerChar = (i == 0 ? 12 : 11) - 2 * width;
			let maxChar = Math.floor((width * slotWidthPx) / pxPerChar);
			if (start < tag.length) {
				let nChar = Math.min(tag.length - start, maxChar);
				lines.push(tag.substr(start, nChar));
				start += nChar;
			}
		}
		return lines;
	};

	const spaceStyling = (styleType) => {
		if (styleType == 'single') {
			return 'mx-0.5 rounded-lg';
		} else if (styleType == 'start') {
			return 'ms-0.5 rounded-s-xl';
		} else if (styleType == 'end') {
			return 'me-0.5 rounded-e-xl';
		} else {
			return 'rounded-none';
		}
	};

	$: innerWidth = 0;
	$: slotWidthPx = parseInt((innerWidth * 88) / resInfo.resources.length / 100);

	const loadReservations = async () => {
		isLoading = true;
		const res = await getReservationsByDate(
			date,
			category === 'pool' ? ReservationCategory.pool : ReservationCategory.classroom
		);
		if (res.status === 'success') {
			reservations = res.reservations || [];
		}
		isLoading = false;
	};

	$: {
		(date || refreshTs) && loadReservations();
	}
</script>

<svelte:window bind:innerWidth />
{#if isLoading}
	<LoadingBar />
{/if}
{#if Settings.getOpenForBusiness(datetimeToLocalDateStr(date)) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else}
	{#if assignment.status === 'error'}
		<div class="font-semibold text-red-600 text-xl text-center">Error assigning reservations!</div>
		<div class="text-sm text-center mb-4">Please report this error to the admin</div>
	{/if}
	<div class="row text-xs sm:text-base">
		<div class="column w-[12%] m-0 text-center">
			<div style="height: 1lh" />
			{#each displayTimes(date, category) as t}
				<div class="font-semibold" style="height: {rowHeight}rem">{t}</div>
			{/each}
		</div>
		{#each resInfo.resources as resource, i}
			<div class="column text-center" style="width: {88 / resInfo.resources.length}%">
				<div class="font-semibold">{resInfo.name} {resource}</div>
				{#if assignment.schedule[i]}
					<div style="height: 0.5rem" />
					{#each assignment.schedule[i] as blk}
						{#if blk.blkType === 'rsv'}
							<div
								class="rsv {category} bg-fixed {spaceStyling(
									blk.styleType
								)} mb-1 text-sm cursor-pointer hover:font-semibold"
								style="height: {rowHeight * (blk.nSlots / slotDiv) - blkMgn}rem"
								on:click={showViewRsvs(blk.data)}
							>
								<div class="block indicator w-full">
									{#if ['single', 'end'].includes(blk.styleType)}
										<span class="rsv-indicator {badgeColor(blk.data)}" />
									{/if}
									{#if ['single', 'start'].includes(blk.styleType)}
										{#each formatTag(blk.data, blk.nSlots, blk.width, slotWidthPx) as line}
											<div>{line}</div>
										{/each}
									{/if}
								</div>
							</div>
						{:else}
							<div style="height: {rowHeight * (blk.nSlots / slotDiv)}rem" />
						{/if}
					{/each}
				{/if}
			</div>
		{/each}
	</div>
{/if}
