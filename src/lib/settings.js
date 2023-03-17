import { settings } from './stores.js';
import { get } from 'svelte/store';

export const Settings = (key) => {
    return get(settings) == null ? '0:00' : get(settings)[key];
};
