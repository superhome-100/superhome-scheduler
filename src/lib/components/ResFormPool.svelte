<script lang="ts">
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
	import { startTimesHHMM, endTimesHHMM, minuteOfDay } from '$lib/reservationTimes';
	import {
		timeStrToMin,
		datetimeToLocalDateStr,
		PanglaoDate,
		getYYYYMMDD
	} from '$lib/datetimeUtils';
	import { canSubmit } from '$lib/stores';
	import { adminView, resTypeModDisabled } from '$lib/utils';
	import { ReservationType } from '$types';
	import type { ReservationEx, ReservationCategoryT } from '$types';
	import InputLabel from './tiny_components/InputLabel.svelte';
	import { storedSettings, storedUser } from '$lib/client/stores';
	import { type SettingsManager } from '$lib/settings';

	export let category: ReservationCategoryT = 'pool';
	export let rsv: ReservationEx | null = null;
	export let dayStr: string = rsv?.date || getYYYYMMDD();
	export let resType: null | 'course' | 'autonomous' = null;
	export let viewOnly = false;
	export let restrictModify = false;
	export let maxNumStudents = 6;
	export let maxTimeHours = 4;
	export let error = '';

	let disabled = viewOnly || restrictModify;

	let lanes = $storedSettings.getPoolLanes(dayStr);
	let rooms = $storedSettings.getClassrooms(dayStr);

	const getStartTimes = (sm: SettingsManager, date: string, category: ReservationCategoryT) => {
		let startTs = startTimesHHMM(sm, date, category);
		let today = PanglaoDate();
		if (!disabled && date === datetimeToLocalDateStr(today)) {
			let now = minuteOfDay(today);
			startTs = startTs.filter((time) => timeStrToMin(time) > now);
			if (startTs.length == 0) {
				startTs = startTimesHHMM(sm, date, category);
			}
		}
		return startTs;
	};
	let chosenStart =
		rsv == null
			? getStartTimes($storedSettings, dayStr, category)[0]
			: rsv.startTime.substring(0, 5);
	let chosenEnd =
		rsv == null ? getStartTimes($storedSettings, dayStr, category)[1] : rsv.endTime.substring(0, 5);
	let autoOrCourse =
		rsv == null ? (resType == null ? ReservationType.autonomous : resType) : rsv.resType;
	let numStudents = rsv == null || rsv.resType !== ReservationType.course ? 1 : rsv.numStudents;
	$canSubmit = true;
	$: showBuddyFields = autoOrCourse === 'autonomous';

	const validEndTime = (startTime: string, endTime: string) => {
		let start = timeStrToMin(startTime);
		let end = timeStrToMin(endTime);
		return end > start && end - start <= maxTimeHours * 60;
	};
</script>

<ResFormGeneric
	{error}
	{viewOnly}
	{restrictModify}
	{showBuddyFields}
	bind:dayStr
	bind:category
	{rsv}
>
	<svelte:fragment slot="inputExtension">
		{#if adminView($storedUser, viewOnly) && category === 'pool'}
			<InputLabel forInput="formLane" label="Lane">
				<!-- admin lane/room assignments are disabled due to the possibility that
			a fixed assignment could make it impossible to auto-assign the remaining reservations -->
				<select id="formLane" name="lane" class="w-full" value={rsv?.lanes[0]}>
					<option value="auto">Auto</option>
					{#each lanes as lane}
						<option value={lane}>{lane}</option>
					{/each}
				</select>
			</InputLabel>
		{/if}
		{#if adminView($storedUser, viewOnly) && category === 'classroom'}
			<InputLabel forInput="formRoom" label="Room">
				<select id="formRoom" name="room" class="w-full" value={rsv.room}>
					<option value="auto">Auto</option>
					{#each rooms as room}
						<option value={room}>{room}</option>
					{/each}
				</select>
			</InputLabel>
		{/if}

		<InputLabel forInput="formStart" label="Start Time">
			<select id="formStart" class="w-full" {disabled} bind:value={chosenStart} name="startTime">
				{#each getStartTimes($storedSettings, dayStr, category) as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</InputLabel>

		<InputLabel forInput="formEnd" label="End Time">
			<select id="formEnd" class="w-full" {disabled} name="endTime" value={chosenEnd}>
				{#each endTimesHHMM($storedSettings, dayStr, category) as t}
					{#if validEndTime(chosenStart, t)}
						<option value={t}>{t}</option>
					{/if}
				{/each}
			</select>
		</InputLabel>

		<InputLabel forInput="formResType" label="Type">
			{#if viewOnly || resType != null || resTypeModDisabled(rsv)}
				<input type="hidden" name="resType" value={autoOrCourse} />
			{/if}
			<select
				id="formResType"
				class="w-full"
				disabled={viewOnly || resType != null || resTypeModDisabled(rsv)}
				bind:value={autoOrCourse}
				name="resType"
			>
				<option value="autonomous">Autonomous</option>
				<option value="course">Course/Coaching</option>
			</select>
			{#if resType != null}
				<input type="hidden" name="resType" value={resType} />
			{/if}
		</InputLabel>

		{#if autoOrCourse === 'course'}
			<InputLabel forInput="formNumStudents" label="# Students">
				<select disabled={viewOnly} value={numStudents} name="numStudents">
					{#each [...Array(restrictModify ? numStudents : maxNumStudents).keys()] as n}
						<option value={n + 1}>{n + 1}</option>
					{/each}
				</select>
			</InputLabel>
		{/if}
	</svelte:fragment>
</ResFormGeneric>
