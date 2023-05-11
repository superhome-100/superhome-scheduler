import { writable } from 'svelte/store';

export const buoys = writable([]);
export const boatAssignments = writable({});
export const canSubmit = writable(false);
export const loginState = writable('pending');
export const notifications = writable([]);
export const profileSrc = writable(null);
export const reservations = writable([]);
export const settings = writable({});
export const user = writable(null);
export const users = writable([]);
export const view = writable('multi-day');
export const viewedDate = writable(new Date());
export const viewedMonth = writable(new Date());
export const viewMode = writable('normal');
