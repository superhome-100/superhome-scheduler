import { datetimeToLocalDateStr } from './datetimeUtils';
import { reservations, user, users, viewMode } from './stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationType } from '$types';

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
		if (['autonomous', 'autonomousPlatform', 'autonomousPlatformCBS'].includes(resType)) {
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
			['pending', 'confirmed'].includes(v.status) && v.category === category && v.date === today
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

// resType can only be changed from course to another type for existing rsvs
export const resTypeModDisabled = (rsv) => rsv != null && rsv.resType != ReservationType.course;
