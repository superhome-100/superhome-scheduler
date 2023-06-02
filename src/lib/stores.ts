import { writable } from 'svelte/store';

// TODO: Add specific types for each store
export const buoys = writable<any[]>([]);
export const boatAssignments = writable<any>({});
export const canSubmit = writable<boolean>(false);
export const loginState = writable<string>('pending');
export const notifications = writable<any[]>([]);
export const profileSrc = writable<any>(null);
export const reservations = writable<any[]>([]);
export const settings = writable<any>({});
export const user = writable<any>(null);
export const userPastReservations = writable<any[]>([]);
export const users = writable<any[]>([]);
export const view = writable<string>('multi-day');
export const viewedDate = writable<Date>(new Date());
export const viewedMonth = writable<Date>(new Date());
export const viewMode = writable<string>('normal');
