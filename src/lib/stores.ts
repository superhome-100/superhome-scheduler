import { writable } from 'svelte/store';
import type { BuoyGroupings, UsersRecord } from './server/xata.codegen';

import type { Settings, Buoy, Reservation } from '$types';

// TODO: Add specific types for each store
export const buoys = writable<Buoy[]>([]);

interface BoatAssignments {
	[date: string]: {
		[buoyId: string]: string | null;
	};
}

export const boatAssignments = writable<BoatAssignments>({});
export const canSubmit = writable<boolean>(false);
export const loginState = writable<'pending' | 'in' | 'out'>('pending');
export const notifications = writable<any[]>([]);
export const profileSrc = writable<any>(null);
export const reservations = writable<Reservation[]>([]);
export const settings = writable<Settings>();
export const user = writable<UsersRecord | null>(null);
export const users = writable<{ [uid: string]: any }>([]);
export const view = writable<string>('multi-day');
export const viewedDate = writable<Date>(new Date());
export const viewedMonth = writable<Date>(new Date());
export const viewMode = writable<string>('normal');
export const stateLoaded = writable<boolean>(false);
export const adminComments = writable<{ [date: string]: BuoyGroupings[] }>({});

// used for triggering refresh of data
interface UpdateStates {
	adminComments: number;
	buoy: number;
	reservations: number;
	boat: number;
}
export const owUpdateStates = writable<Record<string, UpdateStates>>({});

export const updateOWState = (
	date: string,
	prop: 'adminComments' | 'buoy' | 'reservations' | 'boat'
) => {
	owUpdateStates.update((states) => {
		if (!states[date]) {
			states[date] = {
				adminComments: 0,
				buoy: 0,
				reservations: 0,
				boat: 0
			};
		}
		states[date][prop]++;
		return states;
	});
};
