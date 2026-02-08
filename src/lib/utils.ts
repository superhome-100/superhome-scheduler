import { datetimeToLocalDateStr } from './datetimeUtils';
import { viewMode } from './stores';
import { storedUsers } from '$lib/client/stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationCategory, ReservationType, type Buoy, type Reservation, type ReservationEx, type User } from '$types';
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

export const displayTag = (rsv: ReservationEx, admin: boolean): string => {
	let tag = rsv.user_json?.nickname ?? get(storedUsers)[rsv.user].nickname;
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

export const adminView = (user: User | null, viewOnly: boolean): boolean => {
	return user?.privileges === 'admin' && get(viewMode) === 'admin' && viewOnly;
};

export const isMyReservation = (user: User | null, rsv: Reservation | null): boolean => {
	return rsv == null || user?.id === rsv.user;
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

export function getRandomElement<T>(...items: T[]): T {
	const randomIndex = Math.floor(Math.random() * items.length);
	return items[randomIndex];
}

export const stableStringify = (obj: unknown) => {
	return JSON.stringify(obj, (key, value) => {
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			return Object.keys(value).sort().reduce((sorted, k) => {
				sorted[k] = value[k];
				return sorted;
			}, {} as Record<string, any>);
		}
		return value;
	});
}