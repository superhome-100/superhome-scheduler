import { writable } from 'svelte/store';

export const modal = writable(null);
export const canSubmit = writable(false);
export const user = writable(null);
export const viewedDate = writable(new Date());
export const view = writable('multi-day');
export const reservations = writable(null);
export const needsUpdate = writable(true);
export const existing = writable(null);
export const past = writable(null);
export const myReservations = writable({
    'upcoming': writable([]),
    'past': writable([])
});
