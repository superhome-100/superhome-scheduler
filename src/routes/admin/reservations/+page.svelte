<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		storedDayReservationsAll,
		storedDayReservationsAllLoading,
		storedDayReservations_param,
		storedSettings
	} from '$lib/client/stores';
	import MyFloatingElement from '$lib/components/MyFloatingElement.svelte';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import {
		completeHHMM,
		getYYYYMMDD,
		minToHHMM,
		PanglaoDayJs,
		timeStrToMin
	} from '$lib/datetimeUtils';
	import { Constants, type TablesUpdate } from '$lib/supabase.types';
	import { ReservationCategory, type ReservationEx } from '$types';
	import { LRUCache } from 'lru-cache/raw';
	import toast from 'svelte-french-toast';
	import { swipe } from 'svelte-gestures';
	import { browser } from '$app/environment';

	export let data;
	const { supabase } = data;

	$: sm = $storedSettings;
	const dayParamKey = 'day';
	$: dayParam = $page.url.searchParams.get(dayParamKey) ?? undefined;
	$: day = ((d) => {
		try {
			return PanglaoDayJs(d);
		} catch {
			return PanglaoDayJs();
		}
	})(dayParam);
	$: dayStr = getYYYYMMDD(day);

	$: storedDayReservations_param.set({ day: dayStr });

	let draftRsv:
		| (ReservationEx & { _duration: number; _notify: boolean; _orig: ReservationEx })
		| null = null;

	function toggleRow(rsv: ReservationEx) {
		if (draftRsv?.id === rsv.id) {
			draftRsv = null;
		} else {
			draftRsv = {
				...rsv,
				_duration: timeStrToMin(rsv.endTime) - timeStrToMin(rsv.startTime),
				_notify: true,
				_orig: rsv
			};
		}
	}

	const isOverlappingError = (e: any) => {
		if (e instanceof Error) {
			return e.message.indexOf('Reservations:cannot have overlapping same user,date,[time)') > -1;
		}
		return false;
	};

	async function handleSave() {
		if (!draftRsv) return;

		const rsv = draftRsv;

		const keys = [
			'status',
			'owTime',
			'numStudents',
			'price',
			'date',
			'startTime',
			'endTime'
		] as (keyof TablesUpdate<'Reservations'>)[];

		const payload: TablesUpdate<'Reservations'> = {};
		for (const k of keys) {
			if (rsv[k] !== rsv._orig[k]) {
				(payload as any)[k] = rsv[k];
			}
		}
		if (Object.keys(payload).length === 0) return;

		const fn = async () => {
			if (!rsv) throw Error('assert');
			if (rsv.startTime > rsv.endTime) throw Error('start time is bigger than end time');
			if (rsv.resType === 'course' && rsv.numStudents === null)
				throw Error('course should have students');

			console.log('admin updating reservation', payload);

			const { data: result } = await supabase
				.from('Reservations')
				.update(payload)
				.eq('id', rsv.id)
				.select('id')
				.maybeSingle()
				.throwOnError();
			if (result === null) throw Error('Reservation record missing');

			if (rsv._notify) {
				await fetch('/api/notification/notify-reservations-modified', {
					method: 'POST',
					body: JSON.stringify([result.id])
				});
			}

			console.log('admin updated reservation', result);

			// Cleanup on success
			draftRsv = null;
		};

		await toast.promise(fn(), {
			loading: `Updating reservation of ${rsv.user_json.nickname}...`,
			success: `Successfully updated reservation of ${rsv.user_json.nickname}`,
			error: (e) => {
				if (isOverlappingError(e)) {
					return `Update failed: This reservation conflicts with the ${rsv?.user_json.nickname}'s other existing reservation.`;
				} else {
					return `Update failed: ${e.message}`;
				}
			}
		});
	}

	const searchTermParamKey = 'search';
	$: searchTerm = $page.url.searchParams.get(searchTermParamKey) ?? '';
	const categoryParamKey = 'category';
	$: categoryFilter = $page.url.searchParams.get(categoryParamKey) ?? '';
	const owTimeFilterParamKey = 'owTime';
	$: owTimeFilter = $page.url.searchParams.get(owTimeFilterParamKey) ?? '';
	const statusParamKey = 'status';
	let statusFilter = $page.url.searchParams.get(statusParamKey)?.split(',') ?? [];

	type ParamT =
		| typeof dayParamKey
		| typeof searchTermParamKey
		| typeof categoryParamKey
		| typeof owTimeFilterParamKey
		| typeof statusParamKey;

	$: handleParam(statusParamKey, statusFilter.join(','));

	function handleParam(paramType: ParamT, value: string) {
		const query = $page.url.searchParams;
		if (value) {
			query.set(paramType, value);
		} else {
			query.delete(paramType);
		}
		if (browser) {
			goto(`?${query.toString()}`, {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}
		switch (paramType) {
			case dayParamKey:
				dayParam = value;
				break;
			case categoryParamKey:
				categoryFilter = value;
				break;
			case searchTermParamKey:
				searchTerm = value;
				break;
			case statusParamKey:
				break;
			case owTimeFilterParamKey:
				owTimeFilter = value;
			default:
				console.error('undhandled case', paramType);
		}
	}

	function handleInput(paramType: ParamT, e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value;
		handleParam(paramType, value);
	}

	$: searchTermLower = searchTerm.toLowerCase();
	$: filteredReservations = $storedDayReservationsAll
		.filter((r) => statusFilter.length === 0 || statusFilter.includes(r.status))
		.filter((r) => !categoryFilter || categoryFilter === r.category)
		.filter((r) => !owTimeFilter || owTimeFilter === r.owTime)
		.filter((r) => !searchTerm || r.user_json.nickname.toLowerCase().includes(searchTermLower))
		.sort((a, b) =>
			a.startTime !== b.startTime
				? a.startTime < b.startTime
					? -1
					: 1
				: a.user_json.nickname < b.user_json.nickname
				? -1
				: 1
		);

	function otherProperties(rsv: ReservationEx) {
		const keys = [
			'maxDepth',
			'pulley',
			'extraBottomWeight',
			'bottomPlate',
			'largeBuoy',
			'lanes',
			'O2OnBuoy',
			'buoy',
			'room',
			'shortSession',
			'allowAutoAdjust'
		] as (keyof TablesUpdate<'Reservations'>)[];
		let txt = '';
		for (const k of keys) {
			if (rsv[k] !== null) txt += k + ': ' + rsv[k] + '\n';
		}
		return txt;
	}

	const cacheDaySelection = new LRUCache<string, Set<string>>({ max: 100 });
	$: selectedRsvs = ((day) => {
		let c = cacheDaySelection.get(day);
		if (!c) {
			c = new Set<string>();
			cacheDaySelection.set(day, c);
		}
		return c;
	})($storedDayReservations_param.day);

	$: visibleSelectedRsvs = createIntersection(filteredReservations, selectedRsvs);

	function createIntersection(rsvs: ReservationEx[], set: Set<string>) {
		const intersection: ReservationEx[] = [];
		for (const rsv of rsvs) {
			if (set.has(rsv.id)) intersection.push(rsv);
		}
		return intersection;
	}

	function handleSelectAll(event: any) {
		const input = event.currentTarget;
		if (input.checked) {
			filteredReservations.forEach((r) => selectedRsvs.add(r.id));
		} else {
			filteredReservations.forEach((r) => selectedRsvs.delete(r.id));
		}
		selectedRsvs = selectedRsvs;
	}

	function handleSelect(event: any, rsv: ReservationEx) {
		const input = event.currentTarget;
		if (input.checked) selectedRsvs.add(rsv.id);
		else selectedRsvs.delete(rsv.id);
		selectedRsvs = selectedRsvs;
	}

	function confirm(e: any) {
		return window.confirm(
			'Are you sure you want to execute:\n"' + (e?.currentTarget?.innerText ?? '') + '"\n?'
		);
	}

	async function bulkEditSelected(e: any, update: TablesUpdate<'Reservations'>) {
		if (!confirm(e)) return;
		const selected = [...visibleSelectedRsvs];
		const fn = async () => {
			if (update.owTime === 'AM') {
				update.startTime = completeHHMM(sm.getOpenwaterAmStartTime(dayStr));
				update.endTime = completeHHMM(sm.getOpenwaterAmEndTime(dayStr));
			} else if (update.owTime === 'PM') {
				update.startTime = completeHHMM(sm.getOpenwaterPmStartTime(dayStr));
				update.endTime = completeHHMM(sm.getOpenwaterPmEndTime(dayStr));
			}
			const success = [];
			const failures = [];
			for (const rsv of selected) {
				try {
					const { data } = await supabase
						.from('Reservations')
						.update(update)
						.eq('id', rsv.id)
						.eq('category', ReservationCategory.openwater)
						.select('id')
						.maybeSingle()
						.throwOnError();
					if (data) success.push(`Modified ${rsv.user_json.nickname}: ${rsv.category}`);
					try {
						await fetch('/api/notification/notify-reservations-modified', {
							method: 'POST',
							body: JSON.stringify([rsv.id])
						});
					} catch (e) {
						console.error('couldnt send not for modifed reservation', e);
					}
				} catch (e) {
					if (isOverlappingError(e)) {
						failures.push(`Overlapping ${rsv.user_json.nickname}: ${rsv.category}`);
					} else {
						console.error('unknown error when modifing reservation', e);
						failures.push(`Unknown issue with ${rsv.user_json.nickname}: ${rsv.category}`);
					}
				}
			}
			if (failures.length) throw [success, failures];
			return success;
		};
		const objToStr = (o: object) =>
			'\n' +
			Object.entries(o)
				.map((v) => '- ' + v.join(':'))
				.join('\n') +
			'\n';
		return await toast
			.promise(fn(), {
				loading: `Modifying ${selected.length} reservations: ${objToStr(update)}`,
				success: (s) => `Modified ${s.length} reservations: ${objToStr(update)}`,
				error: ([success, failures]: string[][]) => {
					return ['Modified:', ...success, '', 'Failed:', ...failures].join('\n');
				}
			})
			.catch((e) => {
				console.info('rejected bulkEditSelected', e, update, selected);
			});
	}

	async function bulkBatchEditSelected(e: any, update: TablesUpdate<'Reservations'>) {
		if (!confirm(e)) return;
		const selected = [...visibleSelectedRsvs];
		const fn = async () => {
			const { data } = await supabase
				.from('Reservations')
				.update(update)
				.in(
					'id',
					selected.map((r) => r.id)
				)
				.select('id')
				.throwOnError();
			return data;
		};
		const objToStr = (o: object) =>
			'\n' +
			Object.entries(o)
				.map((v) => '- ' + v.join(':'))
				.join('\n') +
			'\n';
		return await toast
			.promise(fn(), {
				loading: `Modifying ${selected.length} reservations: ${objToStr(update)}`,
				success: (s) => `Modified ${s.length} reservations: ${objToStr(update)}`,
				error: `Failed modifying ${selected.length} reservations: ${objToStr(update)}`
			})
			.catch((e) => {
				console.info('rejected bulkBatchEditSelected', e, update, selected);
			});
	}

	function handleKeydown(e: any, element: HTMLElement | null) {
		const searchInput = element as HTMLInputElement;
		const { target, key, ctrlKey, metaKey, altKey } = e;
		const isEditable =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
		if (isEditable) {
			if (target.attributes.name.value !== 'select') return;
		}
		if (ctrlKey || metaKey || altKey) return;
		switch (key) {
			case 'ArrowLeft':
				handleParam('day', getYYYYMMDD(day.add(-1, 'day')));
				return;
			case 'ArrowRight':
				handleParam('day', getYYYYMMDD(day.add(1, 'day')));
				return;
			case 'Backspace':
				searchInput.focus();
				return;
			case 'Enter':
				return;
		}
		// Unicode & Alphanumeric Filter: key.length === 1 identifies printable characters across all languages
		if (key.length === 1) {
			searchInput.focus();
		}
	}

	function swipeHandler(event: any) {
		if (event.detail.direction === 'left') {
			day = day.add(1, 'day');
			handleParam('day', getYYYYMMDD(day.add(1, 'day')));
		} else if (event.detail.direction === 'right') {
			handleParam('day', getYYYYMMDD(day.add(-1, 'day')));
		}
	}

	let menuState = { show: false, x: 0, y: 0 };

	function triggerMenu(e: any) {
		e.preventDefault();
		menuState = {
			show: true,
			x: e.clientX,
			y: e.clientY
		};
	}
</script>

<svelte:window on:keydown={(e) => handleKeydown(e, document.getElementById('searchTerm'))} />

<div
	class="admin-view"
	use:swipe={{ timeframe: 300, minSwipeDistance: 10, touchAction: 'pan-y' }}
	on:swipe={swipeHandler}
>
	<div class="filter-bar">
		<input
			type="date"
			placeholder="Day"
			value={dayStr}
			on:input={(e) => handleInput(dayParamKey, e)}
			class="search-input"
			required
		/>
		<select
			value={categoryFilter}
			on:input={(e) => handleInput(categoryParamKey, e)}
			class="search-input"
		>
			<option value="" selected>Category</option>
			{#each Constants['public']['Enums']['reservation_category'] as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
		<select
			value={owTimeFilter}
			on:input={(e) => handleInput(owTimeFilterParamKey, e)}
			class="search-input"
		>
			<option value="" selected>OW Time</option>
			{#each Constants['public']['Enums']['reservation_ow_time'] as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
		<div class="dropdown">
			<button class="trigger search-input search-input-button">Status:{statusFilter.length}</button>
			<div class="menu">
				{#each Constants['public']['Enums']['reservation_status'] as status}
					<label>
						<input type="checkbox" value={status} bind:group={statusFilter} />
						{status}
					</label>
				{/each}
			</div>
		</div>
		<input
			id="searchTerm"
			type="text"
			placeholder="Search for nickname or id..."
			value={searchTerm}
			on:input={(e) => handleInput(searchTermParamKey, e)}
			class="search-input filter-bar-fill-remaining"
		/>
		<button
			class="search-input search-input-button"
			on:click={triggerMenu}
			disabled={visibleSelectedRsvs.length === 0}>Bulk Edit</button
		>
	</div>

	<MyFloatingElement bind:show={menuState.show} x={menuState.x} y={menuState.y}>
		<div>
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkEditSelected(e, { owTime: 'AM' });
					menuState.show = false;
				}}>Move to AM</button
			>
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkEditSelected(e, { owTime: 'PM' });
					menuState.show = false;
				}}>Move to PM</button
			>
			<br />
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkBatchEditSelected(e, { status: 'confirmed' });
					menuState.show = false;
				}}>Confirm</button
			>
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkBatchEditSelected(e, { status: 'rejected' });
					menuState.show = false;
				}}>Reject</button
			>
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkBatchEditSelected(e, { status: 'canceled' });
					menuState.show = false;
				}}>Cancel</button
			>
			<button
				class="floating-button"
				on:click={async (e) => {
					bulkBatchEditSelected(e, { status: 'pending' });
					menuState.show = false;
				}}>Pending</button
			>
		</div>
	</MyFloatingElement>

	{#if $storedDayReservationsAllLoading}
		<LoadingBar />
	{:else}
		<table class="content-table">
			<thead>
				<tr>
					<th class="select-col"
						><input
							title="Select All"
							name="select"
							type="checkbox"
							on:change={handleSelectAll}
							checked={visibleSelectedRsvs.length === filteredReservations.length}
						/></th
					>
					<th colspan="3"
						>{#if visibleSelectedRsvs.length}Selected {visibleSelectedRsvs.length} |
						{/if}Reservations</th
					>
				</tr>
			</thead>
			<tbody>
				{#each filteredReservations as rsv (rsv.id)}
					<tr class="main-row main-first-row no-border" class:expanded={draftRsv?.id === rsv.id}>
						<td class="select-col" rowspan="2">
							<input
								title="select"
								name="select"
								type="checkbox"
								value={rsv.id}
								on:change={(e) => handleSelect(e, rsv)}
								checked={selectedRsvs.has(rsv.id)}
							/>
						</td>
						<td colspan="2" on:click={() => toggleRow(rsv)} class="name-cell">
							{#if rsv.user_json.nickname === rsv.user_json.name.replaceAll(' ', '')}
								<strong>{rsv.user_json.name}</strong>
							{:else}
								<strong>{rsv.user_json.nickname}</strong>
								<span class="second-line">({rsv.user_json.name})</span>
							{/if}
						</td>
						<td class="actions-col">
							<button class="{rsv.status} ">
								{rsv.status}
							</button>
						</td>
					</tr>

					<tr
						class="main-row main-sub-row"
						class:expanded={draftRsv?.id === rsv.id}
						on:click={() => toggleRow(rsv)}
					>
						<td colspan="3">
							{rsv.category}
							{#if rsv.owTime}
								{rsv.owTime ?? ''}
							{:else}
								{rsv.startTime.substring(0, 5)} - {rsv.endTime.substring(0, 5)}
							{/if}
							| {rsv.resType}{rsv.resType === 'course' ? ` +${rsv.numStudents}` : ''}
						</td>
					</tr>

					{#if draftRsv?.id === rsv.id}
						<tr class="details-row">
							<td colspan="4">
								<div class="editor-panel">
									<div class="field-grid">
										<a href="/admin/users?q={draftRsv.user}">
											<label
												>Owner <input
													type="text"
													style="cursor: pointer; pointer-events: none;"
													bind:value={draftRsv.user_json.nickname}
													readonly
												/></label
											></a
										>
										<label>
											Status
											<select bind:value={draftRsv.status}>
												{#each Constants['public']['Enums']['reservation_status'] as status}
													<option value={status}>{status}</option>
												{/each}
											</select>
										</label>
										<label
											>Category <input type="text" bind:value={draftRsv.category} readonly /></label
										>
										<label>Type <input type="text" bind:value={draftRsv.resType} readonly /></label>
										<label>
											OW Type
											<select
												bind:value={draftRsv.owTime}
												on:change={(e) => {
													if (draftRsv) {
														if (e.currentTarget.value === 'AM') {
															draftRsv.startTime = completeHHMM(
																sm.getOpenwaterAmStartTime(draftRsv.date)
															);
															draftRsv.endTime = completeHHMM(
																sm.getOpenwaterAmEndTime(draftRsv.date)
															);
														} else if (e.currentTarget.value === 'PM') {
															draftRsv.startTime = completeHHMM(
																sm.getOpenwaterPmStartTime(draftRsv.date)
															);
															draftRsv.endTime = completeHHMM(
																sm.getOpenwaterPmEndTime(draftRsv.date)
															);
														}
													}
												}}
												disabled={draftRsv.category !== 'openwater'}
											>
												{#each Constants['public']['Enums']['reservation_ow_time'] as v}
													<option value={v}>{v}</option>
												{/each}
											</select>
										</label>
										<label
											>Students <input
												type="number"
												bind:value={draftRsv.numStudents}
												disabled={draftRsv.resType !== 'course'}
											/></label
										>
										<label>Price <input type="number" bind:value={draftRsv.price} /></label>
										<label>Date <input type="date" bind:value={draftRsv.date} /></label>
										<label
											>Start Time <input
												type="time"
												bind:value={draftRsv.startTime}
												on:change={(e) => {
													if (draftRsv) {
														const newEndTime =
															timeStrToMin(e.currentTarget.value) + draftRsv._duration;
														draftRsv.endTime = minToHHMM(newEndTime);
													}
												}}
												readonly={draftRsv.category === 'openwater'}
											/></label
										>
										<label
											>End Time <input
												type="time"
												bind:value={draftRsv.endTime}
												on:change={(e) => {
													if (draftRsv) {
														let duration =
															timeStrToMin(draftRsv.endTime) - timeStrToMin(draftRsv.startTime);
														if (duration < 0) {
															duration = 0;
															draftRsv.endTime = draftRsv.startTime;
														}
														draftRsv._duration = duration;
													}
												}}
												readonly={draftRsv.category === 'openwater'}
											/></label
										>
										<label
											>Buddies <input
												type="text"
												readonly
												value={draftRsv.buddies_json.map((b) => b.nickname).join(', ')}
											/></label
										>
										<label>Comment <textarea bind:value={draftRsv.comments} readonly /></label>
										<label>Others <textarea readonly>{otherProperties(draftRsv)}</textarea></label>
										<label
											>Created At <input type="text" value={draftRsv.createdAt} readonly /></label
										>
										<label
											>Updated At <input type="text" value={draftRsv.updatedAt} readonly /></label
										>

										<label>UUID <input type="text" value={draftRsv.id} readonly /></label>
									</div>

									<div class="control-strip">
										<input
											title="Notify Owner? (No guarantee but if the user allowed push notifications it might work)"
											type="checkbox"
											bind:checked={draftRsv._notify}
										/>
										<button class="btn-save" on:click={handleSave}>Apply Changes</button>
										<button
											class="btn-cancel"
											on:click={() => {
												draftRsv = null;
											}}>Discard</button
										>
									</div>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	@import '../style.css';

	.search-input-button {
		box-sizing: border-box !important;
		appearance: none !important;
		margin: 4.8px;
		height: 32px;
		padding-top: 2px !important;
		padding-bottom: 2px !important;
	}

	.no-border td {
		border-bottom: none !important;
	}

	.main-first-row td {
		padding-bottom: 0 !important;
	}

	.main-sub-row td {
		padding-top: 0 !important;
		color: #666;
		font-size: 0.9em;
	}

	input {
		appearance: auto;
	}

	.floating-button {
		margin: 2px;
	}

	.pending {
		padding: 1px;
		background-color: #ffff00 !important;
		width: 80px;
		font-size: small;
	}
	.confirmed {
		padding: 1px;
		background-color: #00ff00 !important;
		width: 80px;
		font-size: small;
	}
	.rejected {
		padding: 1px;
		background-color: #ff0000 !important;
		width: 80px;
		font-size: small;
	}
	.canceled {
		padding: 1px;
		background-color: #4f4f50 !important;
		width: 80px;
		font-size: small;
	}

	.dropdown {
		position: relative;
		display: inline-block;
		margin: 0px !important;
		border: 0px;
	}

	.menu {
		display: none; /* Hidden by default */
		position: absolute;
		background: white;
		border: 1px solid #ccc;
		padding: 10px;
		z-index: 1;
		min-width: 120px;
	}

	/* The "Simpler" Trigger */
	.dropdown:hover .menu {
		display: flex;
		flex-direction: column;
	}

	label {
		display: block;
		cursor: pointer;
		white-space: nowrap;
	}
	label:hover {
		background: #f0f0f0;
	}
</style>
