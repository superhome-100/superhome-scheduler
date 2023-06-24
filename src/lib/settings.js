import { settings } from './stores';
import { get } from 'svelte/store';

export const getOn = (setting, date) => {
	let val = setting.default;
	for (let entry of setting.entries) {
		if (entry.startDate <= date && date <= entry.endDate) {
			val = entry.value;
			break;
		}
	}
	return val;
};

export const Settings = {
	get: (name, date) => {
		let setting = get(settings)[name];
		return getOn(setting, date);
	}
};
