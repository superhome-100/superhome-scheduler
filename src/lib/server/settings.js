import { getOn } from '$lib/settings.js';
import { getXataClient } from '$lib/server/xata';
import { parseSettingsTbl } from '$lib/utils.js';

const xata = getXataClient();
let settingsStore = null;
export const Settings = {
	init: async () => {
		if (!settingsStore) {
			let settingsTbl = await xata.db.Settings.getAll();
			settingsStore = parseSettingsTbl(settingsTbl);
		}
	},
	get: (name, date) => {
		let setting = settingsStore[name];
		return getOn(setting, date);
	}
};
