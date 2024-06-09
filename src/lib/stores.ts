import { writable } from 'svelte/store';
import type { BuoyGroupings, UsersRecord } from './server/xata.codegen';

import type { Settings, Buoy, Reservation } from '$types';

import { getBuoys, getIncomingReservations } from '$lib/api';

// TODO: Add specific types for each store
export const buoys = writable<Buoy[]>([]);

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
export const viewMode = writable<string>('normal');
export const stateLoaded = writable<boolean>(false);
export const adminComments = writable<{ [date: string]: BuoyGroupings[] }>({});

export const incomingReservations = writable<Reservation[]>([]);

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

export const syncBuoys = async () => {
	const res = await getBuoys();
	buoys.set(res.buoys);
};

export const syncMyIncomingReservations = async () => {
	const res = await getIncomingReservations();
	if (res.status === 'success') {
		incomingReservations.set(res.reservations || []);
	}
};
