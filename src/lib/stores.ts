import { writable } from 'svelte/store';

export const viewMode = writable<'normal' | 'admin'>('normal');
export const canSubmit = writable<boolean>(false);