import { writable } from 'svelte/store';

export const modal = writable(null);
export const canSubmit = writable(false);
export const user = writable(null);
export const users = writable([]);
export const viewedDate = writable(new Date());
export const view = writable('multi-day');
export const reservations = writable([]);
export const settings = writable({});
