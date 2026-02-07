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
		tag += ' +' + (rsv.numStudents ?? 0);
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

	// Primitive and Null Check
	if (typeof obj1 !== 'object' || obj1 === null ||
		typeof obj2 !== 'object' || obj2 === null) {
		return false;
	}

	// Type/Constructor Mismatch
	if (obj1.constructor !== obj2.constructor) return false;

	// Date Comparison
	if (obj1 instanceof Date && obj2 instanceof Date) {
		return obj1.getTime() === obj2.getTime();
	}

	// RegExp Comparison
	if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
		return obj1.toString() === obj2.toString();
	}

	// Map Comparison
	if (obj1 instanceof Map && obj2 instanceof Map) {
		if (obj1.size !== obj2.size) return false;
		for (const [key, val] of obj1) {
			if (!obj2.has(key) || !deepEqual(val, obj2.get(key))) return false;
		}
		return true;
	}

	// Set Comparison
	if (obj1 instanceof Set && obj2 instanceof Set) {
		if (obj1.size !== obj2.size) return false;
		for (const val of obj1) {
			// Set comparison is O(n^2) for nested objects without a canonical hash
			let found = false;
			for (const otherVal of obj2) {
				if (deepEqual(val, otherVal)) {
					found = true;
					break;
				}
			}
			if (!found) return false;
		}
		return true;
	}

	// TypedArray Comparison
	if (ArrayBuffer.isView(obj1) && ArrayBuffer.isView(obj2)) {
		const view1 = obj1 as Uint8Array;
		const view2 = obj2 as Uint8Array;
		if (view1.length !== view2.length) return false;
		for (let i = 0; i < view1.length; i++) {
			if (view1[i] !== view2[i]) return false;
		}
		return true;
	}

	// Standard Object/Array Comparison
	const keys1 = Object.keys(obj1 as Record<string, unknown>);
	const keys2 = Object.keys(obj2 as Record<string, unknown>);

	if (keys1.length !== keys2.length) return false;

	for (const key of keys1) {
		if (!Object.prototype.hasOwnProperty.call(obj2, key) ||
			!deepEqual((obj1 as any)[key], (obj2 as any)[key])) {
			return false;
		}
	}

	return true;
}

export function getRandomElement<T>(items: T[]): T {
	const randomIndex = Math.floor(Math.random() * items.length);
	return items[randomIndex];
}