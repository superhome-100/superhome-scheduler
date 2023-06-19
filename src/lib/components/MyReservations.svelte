<script lang="ts">
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { minuteOfDay, beforeCancelCutoff } from '$lib/reservationTimes.js';
	import { timeStrToMin } from '$lib/datetimeUtils';
	import { user, userPastReservations, reservations } from '$lib/stores';
	import { getContext } from 'svelte';
	import Modal from './Modal.svelte';
	import CancelDialog from './CancelDialog.svelte';
	import RsvTabs from './RsvTabs.svelte';
	import { Settings } from '$lib/settings.js';

	import type { ReservationData, ReservationPeriod } from '$types';
	import { ReservationCategory, ReservationStatus } from '$types';
	import dayjs from 'dayjs';

	export let resPeriod: ReservationPeriod = 'upcoming';

	function getResPeriod(rsv: ReservationData) {
		let view;
		let today = new Date();
		let todayStr = datetimeToLocalDateStr(today);
		if (rsv.date && rsv.date > todayStr) {
			view = 'upcoming';
		} else if (rsv.date && rsv.date < todayStr) {
			view = 'past';
		} else {
			let rsvMin: number = 0;
			if (rsv.category === ReservationCategory.openwater) {
				if (rsv.owTime === 'AM') {
					rsvMin = timeStrToMin(Settings.get('openwaterAmEndTime', rsv.date));
				} else if (rsv.owTime === 'PM') {
					rsvMin = timeStrToMin(Settings.get('openwaterPmEndTime', rsv.date));
				}
			} else {
				rsvMin = timeStrToMin(rsv.endTime);
			}
			view = rsvMin && rsvMin >= minuteOfDay(today) ? 'upcoming' : 'past';
		}
		return view;
	}

	const bgColorByCategoryFrom = {
		[ReservationCategory.pool]: 'from-pool-bg-from',
		[ReservationCategory.openwater]: 'from-openwater-bg-from',
		[ReservationCategory.classroom]: 'from-classroom-bg-from'
	};

	const bgColorByCategoryTo = {
		[ReservationCategory.pool]: 'to-pool-bg-to',
		[ReservationCategory.openwater]: 'to-openwater-bg-to',
		[ReservationCategory.classroom]: 'to-classroom-bg-to'
	};

	const catDesc = (rsv: ReservationData) => {
		let desc = [rsv.categoryPretty];
		if (rsv.resType === 'course') {
			desc += ' +' + rsv.numStudents;
		}
		return desc;
	};

	const timeDesc = (rsv: ReservationData) => {
		const fmt = (time) => {
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

	const showViewRsv = (rsv: ReservationData) => {
		open(RsvTabs, {
			rsvs: [rsv],
			hasForm: true
		});
	};

	const sortChronologically = (rsvs: ReservationData[], resPeriod: ReservationPeriod) => {
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
		rsvs: ReservationData[];
	};

	const groupRsvs = (
		resPeriod: ReservationPeriod,
		allRsvs: ReservationData[],
		userPastRsvs: ReservationData[]
	): ReservationsByMonth[] => {
		let rsvs: ReservationData[] = [];
		if (resPeriod === 'upcoming') {
			rsvs = allRsvs.filter((rsv) => {
				return rsv?.user?.id === $user.id && getResPeriod(rsv) === resPeriod;
			});
		} else if (resPeriod === 'past') {
			rsvs = userPastRsvs.filter((rsv) => getResPeriod(rsv) === resPeriod);
		}

		const sorted = sortChronologically(rsvs, resPeriod);

		if (resPeriod === 'upcoming') {
			return [{ rsvs: sorted }];
		} else {
			return sorted.reduce((grps, rsv) => {
				const month = dayjs(rsv.date).format('MMMM');
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

	$: rsvGroups = groupRsvs(resPeriod, $reservations, $userPastReservations);

	const statusTextColor = {
		[ReservationStatus.confirmed]: 'text-status-confirmed',
		[ReservationStatus.pending]: 'text-status-pending',
		[ReservationStatus.rejected]: 'text-status-rejected'
	};

	const totalThisMonth = (rsvs: ReservationData[]): number => {
		return rsvs.reduce((t, rsv) => (rsv.price ? t + rsv.price : t), 0);
	};
</script>

{#if $user}
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
							<div class="align-middle m-auto w-fit rounded-lg ${statusTextColor[rsv.status]}">
								{rsv.status}
							</div>
						</td>
						{#if beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category)}
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
{/if}
