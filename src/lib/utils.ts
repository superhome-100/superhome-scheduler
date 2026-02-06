import { datetimeToLocalDateStr } from './datetimeUtils';
import { viewMode } from './stores';
import { storedUsers as users, storedUser as user } from '$lib/client/stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationCategory, ReservationType, type Buoy, type Reservation, type ReservationWithUser } from '$types';
import type { SettingsManager } from './settingsManager';

// interface Reservation {
// 	user: string;
// 	resType: string;
// 	numStudents?: number;
// 	category: string;
// 	status: 'pending' | 'confirmed';
// 	date: string;
// 	maxDepth?: number;
// }

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

export const displayTag = (rsv: ReservationWithUser, admin: boolean): string => {
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

export function getDaySchedule(sm: SettingsManager, rsvs: Reservation[], datetime: Date | string, category: string) {
	const today = datetimeToLocalDateStr(datetime);
	rsvs = rsvs.filter(
		(v) =>
			['pending', 'confirmed'].includes(v.status) && v.category === category && v.date === today
	);
	return assignHourlySpaces(sm, rsvs, today, category as ReservationCategory);
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


export function deepEqual(obj1: unknown, obj2: unknown): boolean {
	if (obj1 === obj2) return true;

	if (typeof obj1 !== 'object' || obj1 === null ||
		typeof obj2 !== 'object' || obj2 === null) {
		return false;
	}

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) return false;

	for (const key of keys1) {
		if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
			return false;
		}
	}

	return true;
}