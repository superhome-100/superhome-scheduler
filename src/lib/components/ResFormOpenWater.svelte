<script lang="ts">
	import { canSubmit, buoys, reservations } from '$lib/stores';
	import { adminView, buoyDesc, isMyReservation } from '$lib/utils.js';
	import { Settings } from '$lib/client/settings';
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';
	import type { Reservation } from '$types';
	import { ReservationCategory, ReservationType } from '$types';
	import { PanglaoDate } from '$lib/datetimeUtils';

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
	let maxDepth = rsv?.maxDepth || 1;
	let owTime = rsv?.owTime || 'AM';
	let numStudents = rsv?.resType !== 'course' ? 1 : rsv.numStudents;
	let pulley = rsv?.pulley;
	let extraBottomWeight = rsv?.extraBottomWeight || false;
	let bottomPlate = rsv?.bottomPlate || false;
	let largeBuoy = rsv?.largeBuoy || false;
	let o2OnBuoy = rsv?.O2OnBuoy || false;
	let shortSession = rsv?.shortSession || false;

	function checkSubmit() {
		$canSubmit = maxDepth > 0;
	}
	checkSubmit();

	$: showBuddyFields = resType === 'autonomous';
	$: sortedBuoys = $buoys.sort((a, b) => (a.maxDepth > b.maxDepth ? 1 : -1));

	const buoyIsAssigned = (name: string) => {
		return $reservations.filter(
			(other) =>
				other.date === rsv.date &&
				other.category === rsv.category &&
				other.owTime === rsv.owTime &&
				other.buoy === name
		).length > 0
			? '*'
			: '';
	};
</script>

<ResFormGeneric {error} {viewOnly} {restrictModify} {showBuddyFields} bind:date bind:category {rsv}>
	<div class="[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5" slot="categoryLabels">
		{#if adminView(viewOnly)}
			<div><label for="formBuoy">Buoy</label></div>
		{/if}
		<div><label for="formOwTime">Time</label></div>
		<div><label for="formResType">Type</label></div>
		{#if resType === 'course'}
			<div><label for="formNumStudents"># Students</label></div>
		{/if}
		{#if isMyReservation(rsv) || adminView(viewOnly)}
			<div><label for="formMaxDepth">Max Depth</label></div>
		{/if}
	</div>

	<div slot="categoryInputs">
		{#if adminView(viewOnly)}
			<div>
				<select id="formBuoy" name="buoy" value={rsv?.buoy}>
					<option value="auto">Auto</option>
					{#each sortedBuoys as buoy}
						<option value={buoy.name}
							>{buoyIsAssigned(buoy?.name)}{buoy.name + ' - ' + buoyDesc(buoy)}</option
						>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<select id="formOwTime" {disabled} name="owTimeManual" bind:value={owTime}>
				<option value="AM">AM</option>
				<option value="PM">PM</option>
			</select>
			<input type="hidden" name="owTime" value={owTime} />
		</div>
		{#if disabled || rsv != null}
			<input type="hidden" name="resType" value={resType} />
		{/if}
		<div>
			<select
				id="formResType"
				disabled={disabled || rsv != null}
				bind:value={resType}
				name="resType"
			>
				<option value="autonomous">Autonomous</option>
				<option value="course">Course/Coaching</option>
				<option value="proSafety">Pay for ProSafety</option>
				{#if date && Settings.getCbsAvailable(date)}
					<option value="cbs">Platform/CBS</option>
				{/if}
			</select>
		</div>
		{#if resType == 'course'}
			<div>
				<select id="formNumStudents" disabled={viewOnly} name="numStudents" value={numStudents}>
					{#each [...Array(restrictModify ? numStudents : 4).keys()] as n}
						<option value={n + 1}>{n + 1}</option>
					{/each}
				</select>
			</div>
		{/if}
		{#if isMyReservation(rsv) || adminView(viewOnly)}
			<div>
				<input
					{disabled}
					type="number"
					id="formMaxDepth"
					class="w-14 valid:border-gray-500 required:border-red-500"
					min="1"
					max={$buoys.reduce((maxv, b) => Math.max(maxv, b.maxDepth), 0)}
					bind:value={maxDepth}
					on:input={checkSubmit}
					name="maxDepth"
					required={maxDepth == undefined}
				/><span class="ml-1 text-sm dark:text-white">meters</span>
			</div>
		{/if}
	</div>
	<div
		class="[&>div]:whitespace-nowrap [&>div]:ml-[20%] [&>div]:sm:ml-[30%] [&>div]:xs:mr-4 [&>div]:mr-2 [&>div]:text-sm [&>div]:dark:text-white text-left block-inline"
		slot="categoryOptionals"
	>
		<div>
			{#if resType === 'autonomous'}
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
			{:else if resType === 'course'}
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
		{#if resType !== 'cbs'}
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
				<label for="formBottomPlate">bottom plate with tags</label>
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
