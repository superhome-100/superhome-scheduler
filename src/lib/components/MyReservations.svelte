<script lang="ts">
	import { datetimeToLocalDateStr, PanglaoDate } from '$lib/datetimeUtils';
	import { minuteOfDay, beforeCancelCutoff } from '$lib/reservationTimes';
	import { timeStrToMin } from '$lib/datetimeUtils';
	import { getContext } from 'svelte';
	import Modal from './Modal.svelte';
	import CancelDialog from './CancelDialog.svelte';
	import RsvTabs from './RsvTabs.svelte';
	import type { Reservation, ReservationPeriod } from '$types';
	import { ReservationCategory, ReservationStatus } from '$types';
	import dayjs from 'dayjs';
	import {
		storedSettings,
		storedIncomingReservations,
		storedPastReservations
	} from '$lib/client/stores';
	import type { SettingsManager } from '$lib/settings';

	export let resPeriod: ReservationPeriod = 'upcoming';

	function getResPeriod(rsv: Reservation, sm: SettingsManager) {
		let view;
		let today = PanglaoDate();
		let todayStr = datetimeToLocalDateStr(today);
		if (rsv.date && rsv.date > todayStr) {
			view = 'upcoming';
		} else if (rsv.date && rsv.date < todayStr) {
			view = 'past';
		} else {
			let rsvMin: number = 0;
			if (rsv.category === ReservationCategory.openwater) {
				if (rsv.owTime === 'AM') {
					rsvMin = timeStrToMin(sm.getOpenwaterAmEndTime(rsv.date));
				} else if (rsv.owTime === 'PM') {
					rsvMin = timeStrToMin(sm.getOpenwaterPmEndTime(rsv.date));
				}
			} else {
				rsvMin = timeStrToMin(rsv.endTime);
			}
			view = rsvMin && rsvMin >= minuteOfDay(today) ? 'upcoming' : 'past';
		}
		return view;
	}

	const bgColorByCategoryFrom: { [key: string]: string } = {
		[ReservationCategory.pool]: 'from-pool-bg-from',
		[ReservationCategory.openwater]: 'from-openwater-bg-from',
		[ReservationCategory.classroom]: 'from-classroom-bg-from'
	};

	const bgColorByCategoryTo: { [key: string]: string } = {
		[ReservationCategory.pool]: 'to-pool-bg-to',
		[ReservationCategory.openwater]: 'to-openwater-bg-to',
		[ReservationCategory.classroom]: 'to-classroom-bg-to'
	};

	const catDesc = (rsv: Reservation) => {
		let desc = rsv.category;
		if (rsv.resType === 'course') {
			desc += ' +' + rsv.numStudents;
		}
		return desc;
	};

	const timeDesc = (rsv: Reservation) => {
		const fmt = (time: string) => {
			let rx = /([0-9]+):([0-9]+)/;
			let m = rx.exec(time);
			let hr = parseInt(m[1]);
			let ind = 'a';
			if (hr >= 12) {
				ind = 'p';
			}
			if (hr > 12) {
				hr -= 12;
			}
			if (m[2] == '00') {
				return hr + ind;
			} else {
				return hr + ':' + m[2] + ind;
			}
		};
		let desc;
		if (['pool', 'classroom'].includes(rsv.category)) {
			desc = ' ' + fmt(rsv.startTime) + '-' + fmt(rsv.endTime);
		} else if (rsv.category === 'openwater') {
			desc = rsv.owTime + ' ' + rsv.maxDepth + 'm ';
		}
		return desc;
	};

	const { open } = getContext('simple-modal') as { open: (component: any, props: any) => void };

	const showViewRsv = (rsv: Reservation) => {
		open(RsvTabs, {
			rsvs: [rsv],
			hasForm: true
		});
	};

	const sortChronologically = (rsvs: Reservation[], resPeriod: ReservationPeriod) => {
		let sign = resPeriod === 'upcoming' ? 1 : -1;
		return rsvs.sort((a, b) => {
			if (a.date > b.date) {
				return sign;
			} else if (a.date === b.date && timeStrToMin(a.startTime) > timeStrToMin(b.startTime)) {
				return sign;
			} else {
				return -sign;
			}
		});
	};

	type ReservationsByMonth = {
		month?: string;
		rsvs: Reservation[];
	};

	const groupRsvs = (
		resPeriod: ReservationPeriod,
		allRsvs: Reservation[],
		userPastRsvs: Reservation[],
		sm: SettingsManager
	): ReservationsByMonth[] => {
		let rsvs: Reservation[] = [];
		if (resPeriod === 'upcoming') {
			rsvs = allRsvs.filter((rsv) => {
				return getResPeriod(rsv, sm) === resPeriod;
			});
		} else if (resPeriod === 'past') {
			rsvs = userPastRsvs.filter((rsv) => getResPeriod(rsv, sm) === resPeriod);
		}

		const sorted = sortChronologically(rsvs, resPeriod);

		if (resPeriod === 'upcoming') {
			return [{ rsvs: sorted }];
		} else {
			return sorted.reduce((grps, rsv) => {
				const month = dayjs(rsv.date).format('MMMM-YYYY');
				const monthGroup = grps.find((g) => g.month === month);
				if (monthGroup) {
					monthGroup.rsvs.push(rsv);
				} else {
					grps.push({
						month: month,
						rsvs: [rsv]
					});
				}
				return grps;
			}, [] as ReservationsByMonth[]);
		}
	};

	$: rsvGroups = groupRsvs(
		resPeriod,
		$storedIncomingReservations,
		$storedPastReservations,
		$storedSettings
	);

	const statusTextColor: { [key: string]: string } = {
		[ReservationStatus.confirmed]: 'text-status-confirmed',
		[ReservationStatus.pending]: 'text-status-pending',
		[ReservationStatus.rejected]: 'text-status-rejected'
	};

	const totalThisMonth = (rsvs: Reservation[]): number => {
		return rsvs.reduce((t, rsv) => (rsv.price ? t + rsv.price : t), 0);
	};
</script>

{#if rsvGroups.length === 0}
	<div>No reservations found.</div>
{/if}
<table class="m-auto border-separate border-spacing-y-1">
	<tbody>
		{#each rsvGroups as { month, rsvs }}
			{#each rsvs as rsv (rsv.id)}
				<tr
					on:click={() => showViewRsv(rsv)}
					on:keypress={() => showViewRsv(rsv)}
					class="[&>td]:w-24 h-10 bg-gradient-to-br {bgColorByCategoryFrom[
						rsv.category
					]} {bgColorByCategoryTo[rsv.category]} cursor-pointer"
				>
					<td class="rounded-s-xl text-white text-sm font-semibold"
						>{dayjs(rsv.date).format('D MMM')}</td
					>
					<td class="text-white text-sm font-semibold">{catDesc(rsv)}</td>
					<td class="text-white text-sm font-semibold">{timeDesc(rsv)}</td>
					<td class="text-white text-sm font-semibold">
						<div class="align-middle m-auto w-fit rounded-lg {statusTextColor[rsv.status]}">
							{rsv.status}
						</div>
					</td>
					{#if beforeCancelCutoff($storedSettings, rsv.date, rsv.startTime, rsv.category)}
						<td
							on:click|stopPropagation={() => {}}
							on:keypress|stopPropagation={() => {}}
							class="rounded-e-xl"
						>
							<Modal>
								<CancelDialog {rsv} />
							</Modal>
						</td>
					{:else}
						<td class="text-white text-sm font-semibold rounded-e-xl">
							{#if rsv.price == null}
								TBD
							{:else}
								₱{rsv.price}
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
			{#if resPeriod === 'past'}
				<tr class="[&>td]:w-24 h-10">
					<td /><td /><td />
					<td class="bg-rose-500 text-white text-sm font-semibold rounded-s-xl">
						{month} Total:
					</td>
					<td class="bg-rose-500 text-white text-sm font-semibold rounded-e-xl">
						₱{totalThisMonth(rsvs)}
					</td>
				</tr>
			{/if}
		{/each}
	</tbody>
</table>
