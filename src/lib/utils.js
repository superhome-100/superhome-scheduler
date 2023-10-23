import { startTimes, inc } from './reservationTimes';
import { datetimeToLocalDateStr, timeStrToMin } from './datetimeUtils';
import { reservations, user, users, viewMode } from './stores';
import { Settings } from './client/settings';
import { get } from 'svelte/store';
import { assignPoolSpaces } from './autoAssign';

export function monthArr(year, month, reservations) {
	let daysInMonth = new Date(year, month + 1, 0).getDate();
	let firstDay = new Date(year, month, 1);
	let startDay = 1 - firstDay.getDay();
	let rows = Math.ceil((firstDay.getDay() + daysInMonth) / 7);
	let month_a = Array(rows)
		.fill()
		.map((w, w_i) =>
			Array(7)
				.fill()
				.map(function (d, d_i) {
					let idx = w_i * 7 + d_i;
					let date = new Date(year, month, startDay + idx);
					let dateStr = datetimeToLocalDateStr(date);
					let dayRsvs = [];
					for (let rsv of reservations) {
						if (rsv.date === dateStr && rsv.status != 'rejected') {
							dayRsvs.push(rsv);
						}
					}
					return { date, rsvs: dayRsvs };
				})
		);
	return month_a;
}

export function removeRsv(id) {
	let rsvs = get(reservations);
	for (let i = 0; i < rsvs.length; i++) {
		if (id === rsvs[i].id) {
			rsvs.splice(i, 1);
			reservations.set(rsvs);
			break;
		}
	}
}

export function cleanUpFormDataBuddyFields(formData) {
	let resType = formData.get('resType');
	let numBuddies = parseInt(formData.get('numBuddies'));
	formData.delete('numBuddies');
	let buddies = [];
	for (let i = 0; i < numBuddies; i++) {
		if (resType === 'autonomous') {
			let id = formData.get('buddy' + i + '_id');
			if (id !== 'undefined') {
				buddies.push(id);
			}
		}
		formData.delete('buddy' + i);
		formData.delete('buddy' + i + '_id');
	}
	formData.set('buddies', JSON.stringify(buddies));
}

export const displayTag = (rsv, admin) => {
	let tag = get(users)[rsv.user.id].nickname;
	if (rsv.resType === 'course') {
		tag += ' +' + rsv.numStudents;
	}
	if (rsv.category === 'openwater' && admin) {
		tag += ' - ' + rsv.maxDepth + 'm';
	}
	return tag;
};

export const badgeColor = (rsvs) => {
	let approved = rsvs.reduce((sts, rsv) => sts && rsv.status === 'confirmed', true);
	return approved ? 'bg-[#00FF00]' : 'bg-[#FFFF00]';
};

function assignClassrooms(rsvs, dateStr) {
	let rooms = Settings.getClassrooms(dateStr);
	let schedule = Array(rooms.length)
		.fill()
		.map(() => {
			return [
				{
					nSlots: 0,
					cls: 'filler',
					data: []
				}
			];
		});

	let sTs = startTimes(Settings, dateStr, 'classroom');
	let nTimes = sTs.length;
	let minTime = timeStrToMin(sTs[0]);
	let incT = inc(Settings, dateStr);
	let timeIdx = (time) => (timeStrToMin(time) - minTime) / incT;

	rsvs.sort((a, b) => (a.room != 'auto' ? -1 : b.room != 'auto' ? 1 : 0));
	rsvs.forEach((rsv) => (rsv.unassigned = rsv.room === 'auto'));

	const lastBlk = (r) => schedule[r][schedule[r].length - 1];
	const continuingBlk = (blk, rsv) => blk.cls === 'rsv' && blk.data[0].id === rsv.id;
	const newBlk = (blk, rsv, t) =>
		rsv.unassigned && ((blk.cls === 'rsv' && blk.end === t) || blk.cls === 'filler');

	for (let t = 0; t < nTimes; t++) {
		let unassigned = Array(rooms.length)
			.fill()
			.map(() => true);
		for (let rsv of rsvs) {
			let start = timeIdx(rsv.startTime);
			let end = timeIdx(rsv.endTime);
			if (start <= t && t < end) {
				if (rsv.room !== 'auto') {
					// pre-assigned
					let r = rooms.indexOf(rsv.room);
					let curBlk = lastBlk(r);
					if (curBlk.cls == 'rsv') {
						if (curBlk.data[0].id === rsv.id) {
							curBlk.nSlots++;
						} else {
							schedule[r].push({
								nSlots: 1,
								cls: 'rsv',
								data: [rsv],
								relativeSpace: 0,
								width: 1
							});
						}
					} else {
						schedule[r].push({
							nSlots: 1,
							cls: 'rsv',
							data: [rsv],
							relativeSpace: 0,
							width: 1
						});
					}
					unassigned[r] = false;
				} else {
					// unassigned
					for (let r = 0; r < rooms.length; r++) {
						let curBlk = lastBlk(r);
						if (continuingBlk(curBlk, rsv)) {
							curBlk.nSlots++;
							unassigned[r] = false;
							break;
						} else if (newBlk(curBlk, rsv, t)) {
							rsv.unassigned = false;
							schedule[r].push({
								start,
								end,
								nSlots: 1,
								cls: 'rsv',
								data: [rsv],
								relativeSpace: 0,
								width: 1
							});
							unassigned[r] = false;
							break;
						}
					}
				}
			}
		}
		for (let r = 0; r < unassigned.length; r++) {
			if (unassigned[r]) {
				let curBlk = lastBlk(r);
				if (curBlk.cls == 'filler') {
					curBlk.nSlots++;
				} else {
					schedule[r].push({
						nSlots: 1,
						cls: 'filler',
						data: []
					});
				}
			}
		}
	}
	return {
		status: 'success',
		schedule
	};
}

export function getDaySchedule(rsvs, datetime, category) {
	let today = datetimeToLocalDateStr(datetime);
	rsvs = rsvs.filter(
		(v) =>
			['pending', 'confirmed'].includes(v.status) && v.category === category && v.date === today
	);
	let result;
	if (category === 'pool') {
		result = assignPoolSpaces(rsvs, today);
	} else if (category === 'classroom') {
		result = assignClassrooms(rsvs, today);
	}

	return result;
}

export const adminView = (viewOnly) => {
	return get(user).privileges === 'admin' && get(viewMode) === 'admin' && viewOnly;
};

export const isMyReservation = (rsv) => {
	return rsv == null || get(user).id === rsv.user.id;
};

export const buoyDesc = (buoy) => {
	let desc = '';
	if (buoy.largeBuoy) {
		desc += 'L';
	}
	if (buoy.pulley) {
		desc += 'P';
	}
	if (buoy.bottomPlate) {
		desc += 'B';
	}
	desc += buoy.maxDepth;
	return desc;
};
