import { datetimeToLocalDateStr } from './datetimeUtils';
import { user, users, viewMode } from './stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationType, type Buoy } from '$types';

interface Reservation {
	user: string;
	resType: string;
	numStudents?: number;
	category: string;
	status: 'pending' | 'confirmed';
	date: string;
	maxDepth?: number;
}

export function cleanUpFormDataBuddyFields(formData: FormData): void {
	const resType = formData.get('resType') as string;
	const numBuddies = parseInt(formData.get('numBuddies') as string);
	formData.delete('numBuddies');
	const buddies: string[] = [];

	for (let i = 0; i < numBuddies; i++) {
		if (['autonomous', 'autonomousPlatform', 'autonomousPlatformCBS'].includes(resType)) {
			const id = formData.get(`buddy${i}_id`);
			if (id !== 'undefined') {
				buddies.push(id as string);
			}
		}
		formData.delete(`buddy${i}`);
		formData.delete(`buddy${i}_id`);
	}
	formData.set('buddies', JSON.stringify(buddies));
}

export const displayTag = (rsv: Reservation, admin: boolean): string => {
	let tag = rsv.Users?.nickname ?? get(users)[rsv.user].nickname;
	if (rsv.resType === 'course') {
		tag += ' +' + rsv.numStudents;
	}
	if (rsv.category === 'openwater' && admin) {
		tag += ' - ' + rsv.maxDepth + 'm';
	}
	return tag;
};

export const badgeColor = (rsvs: Reservation[]): string => {
	const approved = rsvs.reduce((sts, rsv) => sts && rsv.status === 'confirmed', true);
	return approved ? 'bg-[#00FF00]' : 'bg-[#FFFF00]';
};

export function getDaySchedule(rsvs: Reservation[], datetime: Date | string, category: string) {
	const today = datetimeToLocalDateStr(datetime);
	rsvs = rsvs.filter(
		(v) =>
			['pending', 'confirmed'].includes(v.status) && v.category === category && v.date === today
	);
	return assignHourlySpaces(rsvs, today, category);
}

export const adminView = (viewOnly: boolean): boolean => {
	return get(user)?.privileges === 'admin' && get(viewMode) === 'admin' && viewOnly;
};

export const isMyReservation = (rsv: Reservation | null): boolean => {
	return rsv == null || get(user)?.id === rsv.user;
};

export const buoyDesc = (buoy: Buoy): string => {
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
export const resTypeModDisabled = (rsv: Reservation | null): boolean =>
	rsv != null && rsv.resType != ReservationType.course;
