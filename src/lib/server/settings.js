import { getXataClient } from '$lib/server/xata-old';
import { parseSettingsTbl } from '$lib/utils.js';

const xata = getXataClient();
let settingsStore = null;
export const Settings = {
	init: async () => {
		if (!settingsStore) {
			settingsStore = await getSettings();
		}
	},
	get: (name, date) => {
		let setting = settingsStore[name];
		return getOn(setting, date);
	}
};

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

export const getSettings = async () => {
	const settingsTbl = await xata.db.Settings.getAll();
	return parseSettingsTbl(settingsTbl);
};
