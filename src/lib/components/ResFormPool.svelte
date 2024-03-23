<script lang="ts">
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
	import { startTimes, endTimes, minuteOfDay } from '$lib/reservationTimes';
	import { timeStrToMin, datetimeToLocalDateStr, PanglaoDate } from '$lib/datetimeUtils';
	import { canSubmit, user } from '$lib/stores';
	import { Settings } from '$lib/client/settings';
	import { adminView, resTypeModDisabled } from '$lib/utils.js';
	import { ReservationType } from '$types';
	import type { Reservation } from '$types';

	const lanes = () => Settings.getPoolLanes();
	const rooms = () => Settings.getClassrooms();

	export let rsv: Reservation | null = null;
	export let category = 'pool';
	export let date: string | null = null;
	export let dateFn: null | ((arg0: string) => string) = null;
	export let resType: null | 'course' | 'autonomous' = null;
	export let viewOnly = false;
	export let restrictModify = false;
	export let maxNumStudents = 6;
	export let maxTimeHours = 4;
	export let error = '';

	let disabled = viewOnly || restrictModify;

	date = !rsv || !rsv?.date ? (date ? date : dateFn(category)) : rsv.date;

	const getStartTimes = (date: string, category: string) => {
		let startTs = startTimes(Settings, date, category);
		let today = PanglaoDate();
		if (!disabled && date === datetimeToLocalDateStr(today)) {
			let now = minuteOfDay(today);
			startTs = startTs.filter((time) => timeStrToMin(time) > now);
			if (startTs.length == 0) {
				startTs = startTimes(Settings, date, category);
			}
		}
		return startTs;
	};
	let chosenStart = rsv == null ? getStartTimes(date, category)[0] : rsv.startTime;
	let chosenEnd = rsv == null ? getStartTimes(date, category)[1] : rsv.endTime;
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

<ResFormGeneric {error} {viewOnly} {restrictModify} {showBuddyFields} bind:date bind:category {rsv}>
	<div class="[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5" slot="categoryLabels">
		{#if adminView(viewOnly)}
			{#if category === 'pool'}
				<div><label for="formLane">Lane</label></div>
			{:else if category === 'classroom'}
				<div><label for="formRoom">Room</label></div>
			{/if}
		{/if}
		<div><label for="formStart">Start Time</label></div>
		<div><label for="formEnd">End Time</label></div>
		<div><label for="formResType">Type </label></div>
		{#if autoOrCourse === 'course'}
			<div><label for="formNumStudents"># Students</label></div>
		{/if}
	</div>

	<div slot="categoryInputs">
		{#if adminView(viewOnly)}
			{#if category === 'pool'}
				<div>
					<!-- admin lane/room assignments are disabled due to the possibility that
				a fixed assignment could make it impossible to auto-assign the remaining reservations -->
					<select id="formLane" name="lane" value={rsv?.lanes[0]}>
						<option value="auto">Auto</option>
						{#each lanes() as lane}
							<option value={lane}>{lane}</option>
						{/each}
					</select>
				</div>
			{:else if category === 'classroom'}
				<div>
					<select id="formRoom" name="room" value={rsv.room}>
						<option value="auto">Auto</option>
						{#each rooms() as room}
							<option value={room}>{room}</option>
						{/each}
					</select>
				</div>
			{/if}
		{/if}
		<div>
			<select id="formStart" {disabled} bind:value={chosenStart} name="startTime">
				{#each getStartTimes(date, category) as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</div>
		<div>
			<select id="formEnd" {disabled} name="endTime" value={chosenEnd}>
				{#each endTimes(Settings, date, category) as t}
					{#if validEndTime(chosenStart, t)}
						<option value={t}>{t}</option>
					{/if}
				{/each}
			</select>
		</div>
		{#if viewOnly || resType != null || resTypeModDisabled(rsv)}
			<input type="hidden" name="resType" value={autoOrCourse} />
		{/if}
		<div>
			<select
				id="formResType"
				disabled={viewOnly || resType != null || resTypeModDisabled(rsv)}
				bind:value={autoOrCourse}
				name="resType"
			>
				<option value="autonomous">Autonomous</option>
				<option value="course">Course/Coaching</option>
			</select>
		</div>
		{#if resType != null}
			<input type="hidden" name="resType" value={resType} />
		{/if}
		{#if autoOrCourse === 'course'}
			<div>
				<select disabled={viewOnly} value={numStudents} name="numStudents">
					{#each [...Array(restrictModify ? numStudents : maxNumStudents).keys()] as n}
						<option value={n + 1}>{n + 1}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>
</ResFormGeneric>
