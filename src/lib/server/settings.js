import { getOn } from '$lib/settings';
import { getXataClient } from '$lib/server/xata-old';
import { parseSettingsTbl } from '$lib/utils.js';

const xata = getXataClient();
let settingsStore = null;
export const Settings = {
	init: async () => {
		if (!settingsStore) {
			settingsStore = getSettings();
		}
	},
	get: (name, date) => {
		let setting = settingsStore[name];
		return getOn(setting, date);
	}
};

export const getSettings = async () => {
	const settingsTbl = await xata.db.Settings.getAll();
	return parseSettingsTbl(settingsTbl);
};
