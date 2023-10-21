<script lang="ts">
	import { startTimes, endTimes } from '$lib/reservationTimes';
	import { reservations, users, viewedDate, viewMode } from '$lib/stores';
	import { datetimeToLocalDateStr, timeStrToMin } from '$lib/datetimeUtils';
	import { getContext } from 'svelte';
	import RsvTabs from '$lib/components/RsvTabs.svelte';
	import { badgeColor, getDaySchedule } from '$lib/utils.js';
	import { Settings } from '$lib/client/settings';

	export let resInfo;
	export let category;

	const { open } = getContext('simple-modal');

	const showViewRsvs = (rsvs) => {
		open(RsvTabs, {
			rsvs: rsvs,
			hasForm: true,
			disableModify: $viewMode === 'admin'
		});
	};

	$: assignment = getDaySchedule($reservations, $viewedDate, category);

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

	$: slotDiv = slotsPerHr(datetimeToLocalDateStr($viewedDate), category);

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

	const spaceStyling = (width, relSpace) => {
		if (width === 1) {
			return 'mx-0.5 rounded-lg';
		} else {
			if (relSpace == 0) {
				return 'ms-0.5 rounded-s-xl';
			} else if (relSpace == width - 1) {
				return 'me-0.5 rounded-e-xl';
			} else {
				return 'rounded-none';
			}
		}
	};

	$: innerWidth = 0;
	$: slotWidthPx = parseInt(
		(innerWidth * 88) / (resInfo.occupancy * resInfo.resources.length) / 100
	);
</script>

<svelte:window bind:innerWidth />

{#if Settings.getOpenForBusiness(datetimeToLocalDateStr($viewedDate)) === false}
	<div class="font-semibold text-3xl text-center">Closed</div>
{:else if assignment.status === 'error'}
	<div class="font-semibold text-red-600 text-xl text-center mt-4">
		Error assigning reservations!
	</div>
	<div class="text-sm text-center mt-2">Please report this error to the admin</div>
{:else}
	<div class="row text-xs sm:text-base">
		<div class="column w-[12%] m-0 text-center">
			<div style="height: 1lh" />
			{#each displayTimes($viewedDate, category) as t}
				<div class="font-semibold" style="height: {rowHeight}rem">{t}</div>
			{/each}
		</div>
		{#each resInfo.resources as resource, i}
			<div class="column text-center" style="width: {88 / resInfo.resources.length}%">
				<div class="font-semibold">{resInfo.name} {resource}</div>
				<div class="row">
					{#each [...Array(resInfo.occupancy).keys()] as j}
						<div class="column" style="width: {100 / resInfo.occupancy}%">
							{#if assignment.status === 'success'}
								{#if assignment.schedule[i * resInfo.occupancy + j]}
									<div style="height: 0.5rem" />
									{#each assignment.schedule[i * resInfo.occupancy + j] as { nSlots, cls, data, width, relativeSpace }}
										{#if cls === 'rsv'}
											<div
												class="rsv {category} bg-fixed {spaceStyling(
													width,
													relativeSpace
												)} mb-1 text-sm cursor-pointer hover:font-semibold"
												style="height: {rowHeight * (nSlots / slotDiv) - blkMgn}rem"
												on:click={showViewRsvs(data)}
											>
												<div class="block indicator w-full">
													{#if relativeSpace === width - 1}
														<span class="rsv-indicator {badgeColor(data)}" />
													{/if}
													{#if relativeSpace == 0}
														{#each formatTag(data, nSlots, width, slotWidthPx) as line}
															<div>{line}</div>
														{/each}
													{/if}
												</div>
											</div>
										{:else}
											<div style="height: {rowHeight * (nSlots / slotDiv)}rem" />
										{/if}
									{/each}
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
