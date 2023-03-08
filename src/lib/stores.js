import { writable } from 'svelte/store';

export const modal = writable(null);
export const windowStyle = writable({});
export const canSubmit = writable(false);
export const userId = writable(null);
