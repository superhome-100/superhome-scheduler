<script lang="ts">
	import { canSubmit, reservations, buoys } from '$lib/stores';
	import { adminView, buoyDesc, isMyReservation, resTypeModDisabled } from '$lib/utils.js';
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
	import type { Reservation } from '$types';
	import { ReservationCategory, ReservationType } from '$types';
	import { PanglaoDate } from '$lib/datetimeUtils';
	import InputLabel from './tiny_components/InputLabel.svelte';
	import { listenToDateSetting } from '$lib/firestore';
	import type { Unsubscribe } from 'firebase/firestore';
	import { displayTag } from '../../lib/utils';
	import { Settings } from '$lib/client/settings';

	export let rsv: Reservation | null = null;
	export let date: string = rsv?.date || PanglaoDate().toString();
	export let dateFn: null | ((arg0: string) => string) = null;
	export let category: ReservationCategory = ReservationCategory.openwater;
	export let viewOnly = false;
	export let restrictModify = false;
	export let error = '';

	let disabled = viewOnly || restrictModify;

	date = rsv?.date || (dateFn && dateFn(category)) || date;

	let resType: ReservationType = rsv == null ? ReservationType.autonomous : rsv?.resType;
	let maxDepth = rsv?.maxDepth || undefined;
	let owTime = rsv?.owTime || 'AM';
	let numStudents = rsv?.resType !== ReservationType.course ? 1 : rsv.numStudents;
	let pulley = rsv?.pulley;
	let extraBottomWeight = rsv?.extraBottomWeight || false;
	let bottomPlate = rsv?.bottomPlate || false;
	let largeBuoy = rsv?.largeBuoy || false;
	let discipline = 'FIM';
	let diveTime = '1:00';

	function checkSubmit() {
		$canSubmit = maxDepth > 1;
	}
	checkSubmit();

	$: showBuddyFields = [
		ReservationType.autonomous,
		ReservationType.autonomousPlatform,
		ReservationType.autonomousPlatformCBS
	].includes(resType);
	$: sortedBuoys = $buoys.sort((a, b) => (a.maxDepth > b.maxDepth ? 1 : -1));

	const buoyIsAssignedTo = (buoyName: string, reservations: Reservation[]) => {
		const filteredReservations = $reservations.filter(
			(other) => other.owTime === rsv.owTime && other.buoy === buoyName
		);

		return filteredReservations.map((r) => displayTag(r)).join(', ');
	};

	const minMax: Record<ReservationType, { min: number; max: number }> = {
		[ReservationType.course]: {
			min: 0,
			max: 89
		},
		[ReservationType.autonomous]: {
			min: 15,
			max: 89
		},
		[ReservationType.autonomousPlatform]: {
			min: 15,
			max: 99
		},
		[ReservationType.autonomousPlatformCBS]: {
			min: 90,
			max: 130
		},
		[ReservationType.cbs]: {
			min: 15,
			max: 130
		},
		[ReservationType.proSafety]: {
			min: 0,
			max: 89
		},
		[ReservationType.competitionSetupCBS]: {
			min: 15,
			max: 130
		}
	};

	let unsubscribe: Unsubscribe;
	let isAmFull = false;

	const init = async () => {
		if (unsubscribe) unsubscribe();
		isAmFull = false;
		unsubscribe = listenToDateSetting(new Date(date), (setting) => {
			isAmFull = !!setting.ow_am_full;
		});
	};

	$: date, init();
</script>

<ResFormGeneric
	{error}
	{viewOnly}
	{restrictModify}
	{showBuddyFields}
	bind:date
	bind:category
	{rsv}
	extendDisabled={isAmFull && owTime === 'AM'}
	discipline={discipline}
	diveTime={diveTime}
	resType={resType}
>
	<svelte:fragment slot="inputExtension">
		{#if adminView(viewOnly)}
			<InputLabel label="Buoy" forInput="formBuoy">
				<select class="w-full" id="formBuoy" name="buoy" value={rsv?.buoy}>
					<option value="auto">Auto</option>
					{#each sortedBuoys as buoy}
						<option value={buoy.name}
							>{buoy.name + ' - ' + buoyDesc(buoy)} - [{buoyIsAssignedTo(
								buoy?.name,
								$reservations
							)}]</option
						>
					{/each}
				</select>
			</InputLabel>
		{/if}

		<InputLabel label="Type" forInput="formResType">
			<select
				id="formResType"
				disabled={viewOnly || resTypeModDisabled(rsv)}
				bind:value={resType}
				name="resType"
				class="w-full"
			>
				<option value="course">Course/Coaching</option>
				<option value="autonomous">Autonomous on Buoy (0-89m)</option>
				<option value="autonomousPlatform">Autonomous on Platform (0-99m)</option>
				<option value="autonomousPlatformCBS">Autonomous on Platform+CBS (90-130m)</option>
				{#if date && Settings.getCbsAvailable(date)}
					<option value="competitionSetupCBS">Competition-Setup Training (0-130m)</option>
				{/if}
			</select>
			{#if viewOnly || resTypeModDisabled(rsv)}
				<input type="hidden" name="resType" value={resType} />
			{/if}
		</InputLabel>

		<InputLabel label="Time" forInput="formOwTime">
			<div>
				<select id="formOwTime" class="w-full" {disabled} name="owTimeManual" bind:value={owTime}>
					<option value="AM">AM</option>
					<option value="PM">PM</option>
				</select>
				<input type="hidden" name="owTime" value={owTime} />
				{#if isAmFull && owTime === 'AM'}
					<header class="bg-[#FF0000] text-white p-2 rounded-md">
						Morning session is full please book in the afternoon/PM instead.
					</header>
				{/if}
			</div>
		</InputLabel>
		{#if isMyReservation(rsv) || adminView(viewOnly)}
			<InputLabel label="Target Depth" forInput="formMaxDepth">
				<input
					disabled={viewOnly ||
						(restrictModify && (resTypeModDisabled(rsv) || resType != ReservationType.autonomous))}
					type="number"
					id="formMaxDepth"
					class="w-[100px] valid:border-gray-500 required:border-red-500"
					min={minMax[resType].min}
					max={minMax[resType].max}
					bind:value={maxDepth}
					on:input={checkSubmit}
					name="maxDepth"
					required={maxDepth == undefined}
				/>
				<div class="flex-1 text-sm dark:text-white text-left pl-2">meters</div>
			</InputLabel>
		{/if}
		{#if resType === 'course'}
			<InputLabel label="# Students" forInput="formNumStudents">
				<select id="formNumStudents" disabled={viewOnly} name="numStudents" value={numStudents}>
					{#each [...Array(restrictModify ? numStudents : 4).keys()] as n}
						<option value={n + 1}>{n + 1}</option>
					{/each}
				</select>
			</InputLabel>
		{/if}

		{#if resType === 'competitionSetupCBS'}
			<InputLabel label="Discipline" forInput="formNumStudents">
				<select id="formDiscipline" disabled={viewOnly} name="discipline" bind:value={discipline} required
				>
					<option value="FIM">FIM</option>
					<option value="CNF">CNF</option>
					<option value="CWT">CWT</option>
					<option value="CWTB">CWTB</option>
				</select>
			</InputLabel>
			<InputLabel label="Dive Time" forInput="formMaxDepth">
				<input
					disabled={viewOnly || (restrictModify && resTypeModDisabled(rsv))}
					id="formDiveTime"
					class="w-[100px] valid:border-gray-500 required:border-red-500 text-white"
					bind:value={diveTime}
					on:input={checkSubmit}
					name="diveTime"
					required
				/>
				<div class="flex-1 text-sm dark:text-white text-left pl-2">minutes:seconds ie ( 4:30 )</div>
			</InputLabel>
		{/if}
	</svelte:fragment>

	<div class="dark:text-white flex flex-col items-start pl-[70px]" slot="categoryOptionals">
		<div>
			{#if resType === ReservationType.autonomous}
				{#if disabled}
					<input type="hidden" name="pulley" value={pulley ? 'on' : 'off'} />
				{/if}
				<input
					type="checkbox"
					id="formPulley"
					name="pulley"
					checked={pulley}
					{disabled}
					tabindex="5"
				/>
				<label for="formPulley">pulley</label>
			{:else if resType === ReservationType.course}
				{#if disabled}
					<input
						type="hidden"
						name="pulley"
						value={pulley == null ? null : pulley ? 'on' : 'off'}
					/>
				{/if}
				<input type="radio" id="formPulley" name="pulley" value="on" checked={pulley} {disabled} />
				<label for="formPulley">pulley</label>
				<input
					type="radio"
					id="formNoPulley"
					name="pulley"
					value="off"
					checked={pulley == false}
					{disabled}
				/>
				<label for="formNoPulley">no pulley</label>
			{/if}
		</div>
		{#if [ReservationType.autonomous, ReservationType.course].includes(resType)}
			<div>
				{#if disabled}
					<input type="hidden" name="extraBottomWeight" value={extraBottomWeight ? 'on' : 'off'} />
				{/if}
				<input
					type="checkbox"
					id="formBottomWeight"
					name="extraBottomWeight"
					checked={extraBottomWeight}
					{disabled}
					tabindex="5"
				/>
				<label for="formBottomWeight">extra bottom weight</label>
			</div>
			<div>
				{#if disabled}
					<input type="hidden" name="bottomPlate" value={bottomPlate ? 'on' : 'off'} />
				{/if}
				<input
					type="checkbox"
					id="formBottomPlate"
					name="bottomPlate"
					checked={bottomPlate}
					{disabled}
					tabindex="5"
				/>
				<label for="formBottomPlate">bottom plate</label>
			</div>
			<div>
				{#if disabled}
					<input type="hidden" name="largeBuoy" value={largeBuoy ? 'on' : 'off'} />
				{/if}
				<input
					type="checkbox"
					id="formLargeBuoy"
					name="largeBuoy"
					checked={largeBuoy}
					{disabled}
					tabindex="5"
				/>
				<label for="formLargeBuoy">large buoy</label>
			</div>
		{/if}
	</div>
</ResFormGeneric>
