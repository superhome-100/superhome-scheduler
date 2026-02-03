import { writable, get as getVal } from 'svelte/store';
import type { Settings, Buoy, Reservation, UserEx, UserMinimal, BuoyGroupings } from '$types';

import { getBuoys, getIncomingReservations, getUsers } from '$lib/api';
import type { Tables } from './supabase.types';

export const get = getVal;

export type User = Tables<'Users'>;
export type AuthState = {
	loading: boolean;
	error: string | null;
};

export const viewModeStorageKey = 'superhome-scheduler.viewMode';

// TODO: Add specific types for each store
export const buoys = writable<Buoy[]>([]);
export const canSubmit = writable<boolean>(false);
export const loginState = writable<'pending' | 'in' | 'out'>('pending');
export const notifications = writable<Notification[]>([]);
export const reservations = writable<Reservation[]>([]);
export const settings = writable<Settings>();
export const user = writable<UserEx | null>(null);
export const authStore = writable<AuthState>({ loading: true, error: null });
export const users = writable<{ [uid: string]: UserMinimal }>({});
export const view = writable<string>('multi-day');
export const viewedDate = writable<Date>(new Date());
export const viewMode = writable<'normal' | 'admin'>('normal');
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

export const syncUsers = async () => {
	const res = await getUsers();
	users.set(res?.usersById ?? {});
};

export const syncMyIncomingReservations = async () => {
	const res = await getIncomingReservations();
	if (res.status === 'success') {
		incomingReservations.set(res.reservations || []);
	}
};
