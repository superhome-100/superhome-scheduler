<script lang="ts">
	import type { Reservation, BuddyData } from '$types';
	import { ReservationStatus, ReservationCategory } from '$types';
	import { canSubmit, user, users } from '$lib/stores';
	import { Settings } from '$lib/client/settings';
	import { minValidDateStr, maxValidDateStr } from '$lib/reservationTimes';
	import { adminView, isMyReservation } from '$lib/utils.js';
	import { PanglaoDate } from '$lib/datetimeUtils';
	import BuddyMatch from '$lib/components/BuddyMatch.svelte';
	import PlusIcon from '$lib/components/PlusIcon.svelte';
	import DeleteIcon from '$lib/components/DeleteIcon.svelte';
	import ExclamationCircle from '$lib/components/ExclamationCircle.svelte';

	export let rsv: Reservation | null;
	export let date: string = rsv?.date || PanglaoDate().toString();
	export let category: ReservationCategory = rsv?.category || ReservationCategory.pool;
	export let viewOnly = false;
	export let showBuddyFields = true;
	export let restrictModify = false;
	export let error = '';

	let disabled = viewOnly || restrictModify;

	let status: ReservationStatus = rsv?.status || ReservationStatus.pending;
	let comments = rsv?.comments || null;

	$: maxBuddies =
		category === ReservationCategory.openwater ? 3 : category === ReservationCategory.pool ? 1 : 0; //category === ReservationCategory.classroom

	const initBF = (): BuddyData[] => {
		let buddyFields: BuddyData[] = [];
		if (rsv != null && rsv.buddies != null) {
			for (let i = 0; i < rsv.buddies.length; i++) {
				buddyFields.push({
					// @ts-ignore - add proper user type to $users
					name: $users[rsv.buddies[i]].nickname as string,
					userId: rsv.buddies[i],
					id: i,
					matches: []
				});
			}
		}
		return buddyFields;
	};

	$: buddyFields = initBF();

	$: currentBF = { name: '', matches: [] } as BuddyData;

	const addBuddyField = () => {
		buddyFields = [...buddyFields, { name: '', matches: [], id: buddyFields.length }];
	};

	const removeBuddyField = (bf: BuddyData) => {
		for (let i = 0; i < buddyFields.length; i++) {
			if (bf.id === buddyFields[i].id) {
				buddyFields.splice(i, 1);
				for (let i = 0; i < buddyFields.length; i++) {
					buddyFields[i].id = i;
				}
				buddyFields = [...buddyFields];
				break;
			}
		}
	};

	function matchUser() {
		hiLiteIndex = 0;
		let currentBuddies = buddyFields.filter((bf) => bf.id != currentBF.id).map((bf) => bf.name);
		currentBF.matches = [];
		if (currentBF.name.length > 0) {
			let buddyName = currentBF.name.toLowerCase();
			for (let id in $users) {
				let record = $users[id];
				if (
					record.status !== 'disabled' &&
					record.id !== $user.id &&
					!currentBuddies.includes(record.nickname)
				) {
					let nameFrag = record.nickname.slice(0, buddyName.length).toLowerCase();
					if (buddyName === nameFrag) {
						currentBF.matches.push(record);
					}
				}
			}
		}
		if (currentBF.matches.length == 0 && currentBF.name.length > 0) {
			//don't allow user to type an unknown user name
			currentBF.name = currentBF.name.slice(0, currentBF.name.length - 1);
			matchUser();
		} else {
			buddyFields = [...buddyFields];
		}
	}

	const focus = (el: HTMLElement) => (rsv == null ? el.focus() : null);

	$: if (!currentBF.name) {
		currentBF.matches = [];
		hiLiteIndex = 0;
	}

	const setInputVal = (match: any) => {
		currentBF.name = match.nickname;
		currentBF.userId = match.id;
		currentBF.matches = [];
		buddyFields = [...buddyFields];
		hiLiteIndex = 0;
		// @ts-ignore - sveltekit doesn't like this
		document.querySelector('#buddy' + currentBF.id + '-input').focus();
	};

	let hiLiteIndex = 0;

	const navigateList = (e: any) => {
		if (currentBF?.matches && currentBF?.matches.length > 0) {
			if (e.key === 'ArrowDown' && hiLiteIndex <= currentBF.matches.length - 1) {
				hiLiteIndex === null ? (hiLiteIndex = 0) : (hiLiteIndex += 1);
			} else if (e.key === 'ArrowUp' && hiLiteIndex !== null) {
				hiLiteIndex === 0 ? (hiLiteIndex = currentBF.matches.length - 1) : (hiLiteIndex -= 1);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				setInputVal(currentBF.matches[hiLiteIndex]);
			} else {
				return;
			}
		}
	};

	const autocompUlStyle =
		'relative ml-2 top-0 border border-solid border-bg-gray-300 ' + 'rounded text-sm';

	const bdColor: { [key in ReservationStatus]: string } = {
		[ReservationStatus.confirmed]: 'border-status-confirmed',
		[ReservationStatus.pending]: 'border-status-pending',
		[ReservationStatus.rejected]: 'border-status-rejected'
	};

	const statusStyle = (status: ReservationStatus) =>
		'align-middle px-2 py-0 pb-1 mb-1 ml-2 w-fit ' +
		'text-xl text-gray-500 dark:text-gray-300 ' +
		'bg-white dark:bg-gray-500 ' +
		'rounded-lg border ' +
		bdColor[status] +
		' ' +
		'ring-1 ring-gray-500 dark:ring-gray-300';
</script>

<svelte:window on:keydown={navigateList} />

<div class="row w-full">
	<div class="column labels text-right w-[33%]">
		{#if viewOnly}
			<div class="form-label h-8 mb-1"><label for="formStatus">Status</label></div>
		{/if}
		<div class="form-label h-8 mb-0.5"><label for="formDate">Date</label></div>
		<div class="form-label h-8 mb-0.5"><label for="formCategory">Category</label></div>
		<slot name="categoryLabels" />

		{#if showBuddyFields}
			{#if viewOnly}
				<div class="form-label h-8 mb-0.5"><label>Buddies</label></div>
			{:else}
				<div class="form-label h-8 mb-0.5">
					<label>Add buddy</label>
					<button
						class="p-0"
						type="button"
						on:click={addBuddyField}
						disabled={disabled || buddyFields.length == maxBuddies}
						tabindex="1"
					>
						<PlusIcon svgClass="h-6 w-6" />
					</button>
				</div>
			{/if}
			{#if buddyFields.length > 1}
				{#each buddyFields.slice(1) as bf}
					<div class="h-8 mb-0.5" />
				{/each}
			{/if}
		{/if}
		{#if isMyReservation(rsv) || adminView(viewOnly)}
			<div class="form-label h-8 mb-0.5"><label for="formComments">Comments</label></div>
		{/if}
	</div>
	<div class="column inputs text-left w-[67%]">
		{#if viewOnly}
			<div class={statusStyle(rsv.status)}>
				{rsv.status}
			</div>
		{/if}
		<div>
			<input type="hidden" name="user" value={JSON.stringify({ id: $user.id })} />
			<input type="hidden" name="date" value={date} />
			<input type="hidden" name="category" value={category} />
			<input type="hidden" name="status" value={status} />
		</div>
		<div>
			<input
				type="date"
				name="date"
				id="formDate"
				class="w-44"
				min={minValidDateStr(Settings, category)}
				max={maxValidDateStr(Settings)}
				bind:value={date}
				{disabled}
			/>
		</div>
		<div>
			<select
				name="category"
				id="formCategory"
				bind:value={category}
				disabled={disabled || rsv != null}
			>
				<option value={ReservationCategory.pool}>Pool</option>
				<option value={ReservationCategory.openwater}>Open Water</option>
				<option value={ReservationCategory.classroom}>Classroom</option>
			</select>
		</div>
		<slot name="categoryInputs" />
		{#if showBuddyFields}
			{#if buddyFields.length == 0}
				<div class="h-8 mb-0.5" />
			{:else}
				{#each buddyFields as bf (bf.id)}
					<input type="hidden" value={bf.userId} name="buddy{bf.id}_id" />
					<div class="relative table">
						<div class="table-cell align-middle">
							<input
								id={'buddy' + bf.id + '-input'}
								type="text"
								class="w-36 xs:w-44"
								autocomplete="off"
								name="buddy{bf.id}"
								bind:value={bf.name}
								on:input={matchUser}
								on:focus={() => (currentBF = bf)}
								use:focus
								{disabled}
								tabindex="2"
							/>
							{#if !viewOnly}
								<button
									class="dark:text-white p-0"
									style="vertical-align:inherit"
									type="button"
									on:click={() => removeBuddyField(bf)}
									{disabled}
									tabindex="3"><DeleteIcon svgStyle={'h-6 w-6'} /></button
								>
							{/if}
						</div>
					</div>
					{#if bf?.matches && bf?.matches?.length > 0}
						<ul class={autocompUlStyle}>
							{#each bf.matches as m, i}
								<BuddyMatch
									itemLabel={m.nickname}
									highlighted={i === hiLiteIndex}
									on:click={() => setInputVal(m)}
								/>
							{/each}
						</ul>
					{/if}
				{/each}
			{/if}
		{/if}
		{#if isMyReservation(rsv) || adminView(viewOnly)}
			<div>
				<textarea
					id="formComments"
					name="comments"
					class="w-44 xs:w-52 mb-4"
					bind:value={comments}
					tabindex="4"
					{disabled}
				/>
			</div>
		{/if}
	</div>
</div>
<div class="row w-full">
	<div class="column w-full">
		<slot name="categoryOptionals" />
	</div>
</div>

<input type="hidden" name="numBuddies" value={buddyFields.length} />

<div class="row w-full">
	<div class="column w-full">
		{#if error}
			<div
				class="my-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative w-fit left-1/2 -translate-x-2/4"
				role="alert"
			>
				<span class="block sm:inline"><ExclamationCircle />{error}</span>
			</div>
		{/if}
		<div class="text-right p-2">
			<button
				type="submit"
				class="bg-gray-100 disabled:text-gray-400 px-3 py-1"
				tabindex="6"
				disabled={!$canSubmit}
				hidden={viewOnly}
			>
				{#if rsv}
					Update
				{:else}
					Submit
				{/if}
			</button>
		</div>
	</div>
</div>
