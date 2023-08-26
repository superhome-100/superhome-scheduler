<script lang="ts">
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
	import { startTimes, endTimes, minuteOfDay } from '$lib/reservationTimes.js';
	import { timeStrToMin, datetimeToLocalDateStr, PanglaoDate } from '$lib/datetimeUtils';
	import { canSubmit, user } from '$lib/stores';
	import { Settings } from '$lib/settings';
	import { adminView } from '$lib/utils.js';
	import type { ReservationData } from '$types';

	const lanes = () => Settings.get('poolLanes');
	const rooms = () => Settings.get('classrooms');

	export let rsv: ReservationData | null = null;
	export let category = 'pool';
	export let date: string | null = null;
	export let dateFn: null | ((arg0: string) => string) = null;
	export let resType: null | 'course' | 'autonomous' = null;
	export let viewOnly = false;
	export let restrictModify = false;
	export let maxNumStudents = 4;
	export let maxTimeHours = 4;
	export let error = ''

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
	let autoOrCourse = rsv == null ? (resType == null ? 'autonomous' : resType) : rsv.resType;
	let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
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
				{#if rsv?.resType === 'course' && (rsv?.numStudents || 1) > Settings.get('maxOccupantsPerLane')}
					<div><label for="formLane1">1st Lane</label></div>
					<div><label for="formLane2">2nd Lane</label></div>
				{:else}
					<div><label for="formLane1">Lane</label></div>
				{/if}
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
					<select id="formLane1" name="lane1" value={rsv?.lanes[0]}>
						<option value="auto">Auto</option>
						{#each lanes() as lane}
							<option value={lane}>{lane}</option>
						{/each}
					</select>
				</div>
				{#if rsv.resType === 'course' && rsv.numStudents > Settings.get('maxOccupantsPerLane')}
					<div>
						<select id="formLane2" name="lane2" value={rsv.lanes[1]}>
							<option value="auto">Auto</option>
							{#each lanes() as lane}
								<option value={lane}>{lane}</option>
							{/each}
						</select>
					</div>
				{/if}
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
		{#if disabled || resType != null || rsv != null}
			<input type="hidden" name="resType" value={autoOrCourse} />
		{/if}
		<div>
			<select
				id="formResType"
				disabled={disabled || resType != null || rsv != null}
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
