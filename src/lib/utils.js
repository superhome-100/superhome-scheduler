import { datetimeToLocalDateStr } from './datetimeUtils';
import { reservations, user, users, viewMode } from './stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationCategory } from '$types';

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

export function getDaySchedule(rsvs, datetime, category) {
	let today = datetimeToLocalDateStr(datetime);
	rsvs = rsvs.filter(
		(v) =>
			['pending', 'confirmed'].includes(v.status) &&
			v.category === category &&
			v.date === today
	);
	return assignHourlySpaces(rsvs, today, category);
}

export const adminView = (viewOnly) => {
	return get(user).privileges === 'admin' && get(viewMode) === 'admin' && viewOnly;
};

export const isMyReservation = (rsv) => {
	return rsv == null || get(user).id === rsv.user.id;
};

export const buoyDesc = (buoy) => {
	let desc = '';
	if (buoy.name === 'auto') return desc;

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
