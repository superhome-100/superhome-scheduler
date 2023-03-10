import { writable } from 'svelte/store';

export const modal = writable(null);
export const canSubmit = writable(false);
export const userId = writable(null);
export const viewedDate = writable(new Date());
export const view = writable('multi-day');
export const myReservations = writable(null);
export const reservations = writable(null);
