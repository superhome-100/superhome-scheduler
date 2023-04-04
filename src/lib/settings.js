import { settings } from './stores.js';
import { get } from 'svelte/store';

export const Settings = (name, date) => {
    let setting = get(settings)[name];
    let val = setting.default;
    for (let entry of setting.entries) {
        if (entry.startDate <= date && date <= entry.endDate) {
            val = entry.value;
            break;
        }
    }
    return val;
};

