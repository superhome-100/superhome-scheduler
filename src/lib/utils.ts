import { datetimeToLocalDateStr, dayjs, getYYYYMMDD } from './datetimeUtils';
import { viewMode } from './stores';
import { storedUsers } from '$lib/client/stores';
import { get } from 'svelte/store';
import { assignHourlySpaces } from './autoAssign';
import { ReservationCategory, ReservationType, type Buoy, type OWTimeT, type Reservation, type ReservationCategoryT, type ReservationEx, type User } from '$types';
import type { SettingsManager } from './settings';
import type { Dayjs } from 'dayjs';

/**
 * Wraps a promise with a maximum execution time.
 * @param promise The asynchronous operation to monitor.
 * @param timeoutMs Maximum time allowed in milliseconds.
 * @returns A promise that resolves with the original value or rejects on timeout.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;

	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(`Operation timed out after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	return Promise.race([promise, timeoutPromise]).finally(() => {
		clearTimeout(timer);
	});
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


export function getRandomElementUsingGenerator<T>(rngGen: () => number, ...items: T[]): T {
	const randomIndex = Math.floor(rngGen() * items.length);
	return items[randomIndex];
}

export function getRandomElement<T>(...items: T[]): T {
	return getRandomElementUsingGenerator(Math.random, ...items);
}

export function createRandomGeneratorFromString(str: string): () => number {
	// Simple hash to convert string to 32-bit integer seed
	let seed = 0;
	for (let i = 0; i < str.length; i++) {
		seed = (Math.imul(31, seed) + str.charCodeAt(i)) | 0;
	}
	return function () {
		const x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	}
}

export function getRandomElementUsingSeed<T>(seed: string, ...items: T[]): T {
	return getRandomElementUsingGenerator(createRandomGeneratorFromString(seed), ...items);
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

export const isOpenForBooking = ((sm: SettingsManager, date: string | Dayjs | Date, category: ReservationCategory | ReservationCategoryT, owTime: OWTimeT | null) => {
	const dateStr = getYYYYMMDD(dayjs(date));
	if (!sm.get('openForBusiness', dateStr)) return false;
	switch (category) {
		case ReservationCategory.pool:
			return sm.get('poolBookable', dateStr);
		case ReservationCategory.classroom:
			return sm.get('classroomBookable', dateStr);
		case ReservationCategory.openwater:
			if (owTime) {
				if (owTime === 'AM') return sm.get('openwaterAmBookable', dateStr)
				else if (owTime === 'PM') sm.get('openwaterPmBookable', dateStr)
			}
			return sm.get('openwaterAmBookable', dateStr) || sm.get('openwaterPmBookable', dateStr);
		default:
			throw Error(`assert: unknown ${category}`);
	}
});