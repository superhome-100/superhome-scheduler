<script>
	import { canSubmit, buoys, reservations } from '$lib/stores';
	import { adminView, buoyDesc } from '$lib/utils.js';
	import { Settings } from '$lib/settings.js';
	import ResFormGeneric from '$lib/components/ResFormGeneric.svelte';

	export let rsv = null;
	export let date;
	export let dateFn = null;
	export let category;
	export let viewOnly = false;
	export let restrictModify = false;

	let disabled = viewOnly || restrictModify;

	date = rsv == null ? (date == null ? dateFn(category) : date) : rsv.date;

	let resType = rsv == null ? 'autonomous' : rsv.resType;
	let maxDepth = rsv == null || rsv.maxDepth == null ? null : rsv.maxDepth;
	let owTime = rsv == null ? 'AM' : rsv.owTime;
	let numStudents = rsv == null || rsv.resType !== 'course' ? 1 : rsv.numStudents;
	let pulley = rsv == null ? null : rsv.pulley;
	let extraBottomWeight = rsv == null ? false : rsv.extraBottomWeight;
	let bottomPlate = rsv == null ? false : rsv.bottomPlate;
	let largeBuoy = rsv == null ? false : rsv.largeBuoy;
	let o2OnBuoy = rsv == null ? false : rsv.O2OnBuoy;

	function checkSubmit() {
		$canSubmit = maxDepth > 0;
	}
	checkSubmit();

	$: showBuddyFields = resType === 'autonomous';
	$: sortedBuoys = $buoys.sort((a, b) => (a.maxDepth > b.maxDepth ? 1 : -1));

	const buoyIsAssigned = (name) => {
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

<ResFormGeneric {viewOnly} {restrictModify} {showBuddyFields} bind:date bind:category {rsv}>
	<div class="[&>div]:form-label [&>div]:h-8 [&>div]:m-0.5" slot="categoryLabels">
		{#if adminView(viewOnly)}
			<div><label for="formBuoy">Buoy</label></div>
		{/if}
		<div><label for="formOwTime">Time</label></div>
		<div><label for="formResType">Type</label></div>
		{#if resType === 'course'}
			<div><label for="formNumStudents"># Students</label></div>
		{/if}
		{#if !viewOnly || adminView(viewOnly)}
			<div><label for="formMaxDepth">Max Depth</label></div>
		{/if}
	</div>

	<div slot="categoryInputs">
		{#if adminView(viewOnly)}
			<div>
				<select id="formBuoy" name="buoy" value={rsv.buoy}>
					<option value="auto">Auto</option>
					{#each sortedBuoys as buoy}
						<option value={buoy.name}
							>{buoyIsAssigned(buoy.name)}{buoy.name + ' - ' + buoyDesc(buoy)}</option
						>
					{/each}
				</select>
			</div>
		{/if}
		<div>
			<select id="formOwTime" {disabled} name="owTime" value={owTime}>
				<option value="AM">AM</option>
				<option value="PM">PM</option>
			</select>
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
				{#if Settings.get('cbsAvailable', date)}
					<option value="cbs">CBS</option>
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
		{#if !viewOnly || adminView(viewOnly)}
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
		<div>
			{#if disabled}
				<input type="hidden" name="O2OnBuoy" value={o2OnBuoy ? 'on' : 'off'} />
			{/if}
			<input
				type="checkbox"
				id="formO2OnBuoy"
				name="O2OnBuoy"
				checked={o2OnBuoy}
				{disabled}
				tabindex="5"
			/>
			<label for="formO2OnBuoy">O2 on buoy (additional fee)</label>
		</div>
	</div>
</ResFormGeneric>
