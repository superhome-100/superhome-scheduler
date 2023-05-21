import { startTimes, inc } from './reservationTimes.js';
import { datetimeToLocalDateStr, timeStrToMin } from './datetimeUtils.js';
import { reservations, user, viewMode } from './stores.js';
import { Settings } from './settings.js';
import { get } from 'svelte/store';
import { assignPoolSpaces, patchSchedule } from './autoAssignPool.js';

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

export function augmentRsv(rsv, user = null) {
	let startTime = rsv.startTime;
	let endTime = rsv.endTime;
	let categoryPretty = rsv.category.charAt(0).toUpperCase() + rsv.category.slice(1);
	if (rsv.buddies == null) {
		rsv.buddies = [];
	}
	if (rsv.category === 'openwater') {
		if (rsv.owTime === 'AM') {
			startTime = Settings.get('openwaterAmStartTime', rsv.date);
			endTime = Settings.get('openwaterAmEndTime', rsv.date);
		} else if (rsv.owTime === 'PM') {
			startTime = Settings.get('openwaterPmStartTime', rsv.date);
			endTime = Settings.get('openwaterPmEndTime', rsv.date);
		}
	}
	let newRsv = {
		...rsv,
		categoryPretty,
		startTime,
		endTime
	};

	if (user) {
		newRsv.user = user;
	}

	return newRsv;
}

export function convertReservationTypes(data) {
	if ('maxDepth' in data) {
		data.maxDepth = parseInt(data.maxDepth);
	}
	if (data.category === 'openwater') {
		for (let opt of ['O2OnBuoy', 'extraBottomWeight', 'bottomPlate', 'largeBuoy']) {
			data[opt] = data[opt] === 'on';
		}
		// preserve whether or not user indicated a pulley preference
		data.pulley = data.pulley === undefined ? null : data.pulley === 'on';
	}
	if ('numStudents' in data) {
		data.numStudents = parseInt(data.numStudents);
	}
	for (let f of ['buddies', 'oldBuddies', 'delBuddies']) {
		if (f in data) {
			data[f] = JSON.parse(data[f]);
		}
	}
	if (data.price != null) {
		data.price = parseInt(data.price);
	}

	return data;
}

export function updateReservationFormData(formData) {
	let resType = formData.get('resType');
	let numBuddies = parseInt(formData.get('numBuddies'));
	formData.delete('numBuddies');
	let buddies = [];
	for (let i = 0; i < numBuddies; i++) {
		if (resType === 'autonomous') {
			let name = formData.get('buddy' + i);
			if (name !== '') {
				buddies.push(formData.get('buddy' + i + '_id'));
			}
		}
		formData.delete('buddy' + i);
		formData.delete('buddy' + i + '_id');
	}
	formData.set('buddies', JSON.stringify(buddies));
}

export const displayTag = (rsv) => {
	let tag = rsv.user.nickname;
	if (rsv.resType === 'course') {
		tag += ' +' + rsv.numStudents;
	}
	if (rsv.category === 'openwater') {
		tag += ' - ' + rsv.maxDepth + 'm';
	}
	return tag;
};

export function parseSettingsTbl(settingsTbl) {
	let settings = {};
	let fields = new Set(settingsTbl.map((e) => e.name));

	let fixTypes = (e) => {
		let name = e.name;
		let v = e.value;
		if (
			[
				'maxOccupantsPerLane',
				'maxChargeableOWPerMonth',
				'refreshIntervalSeconds',
				'reservationLeadTimeDays'
			].includes(name)
		) {
			v = parseInt(v);
		}
		if (name === 'refreshIntervalSeconds') {
			name = 'refreshInterval';
			v = v * 1000;
		}
		if (
			[
				'cbsAvailable',
				'classroomBookable',
				'openForBusiness',
				'openwaterAmBookable',
				'openwaterPmBookable',
				'poolBookable'
			].includes(name)
		) {
			v = v === 'true';
		}
		if (['poolLanes', 'classrooms', 'boats', 'captains'].includes(name)) {
			v = v.split(';');
		}

		return {
			...e,
			name,
			value: v
		};
	};

	fields.forEach((field) => {
		let entries = settingsTbl.filter((e) => e.name === field).map((e) => fixTypes(e));
		let def = entries.splice(
			entries.findIndex((e) => e.startDate === 'default'),
			1
		)[0];
		settings[def.name] = {
			default: def.value,
			entries
		};
	});
	return settings;
}

export const badgeColor = (rsvs) => {
	let approved = rsvs.reduce((sts, rsv) => sts && rsv.status === 'confirmed', true);
	return approved ? 'bg-[#00FF00]' : 'bg-[#FFFF00]';
};

export function categoryIsBookable(sub) {
	let val;
	let msg;
	if (sub.category === 'pool') {
		val = Settings.get('poolBookable', sub.date);
		msg = 'Pool';
	} else if (sub.category === 'openwater') {
		if (sub.owTime == 'AM') {
			val = Settings.get('openwaterAmBookable', sub.date);
			msg = 'AM Openwater';
		} else if (sub.owTime == 'PM') {
			val = Settings.get('openwaterPmBookable', sub.date);
			msg = 'PM Openwater';
		}
	} else if (sub.category === 'classroom') {
		val = Settings.get('classroomBookable', sub.date);
		msg = 'Classroom';
	}
	if (val) {
		return { result: true };
	} else {
		return {
			result: false,
			message: msg + ' reservations are not bookable on this date'
		};
	}
}

function assignClassrooms(rsvs, dateStr) {
	let rooms = Settings.get('classrooms', dateStr);
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
		if (result.status === 'success') {
			// format data according to old assignment algorithm
			// so display code doesn't have to change
			result.schedule = patchSchedule(result.schedule);
		}
	} else if (category === 'classroom') {
		result = assignClassrooms(rsvs, today);
	}

	return result;
}

export const adminView = (viewOnly) => {
	return get(user).privileges === 'admin' && get(viewMode) === 'admin' && viewOnly;
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

export const addMissingFields = (submitted, original) => {
	for (let field in original) {
		if (submitted[field] === undefined) {
			submitted[field] = original[field];
		}
	}
};
