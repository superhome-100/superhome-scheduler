import { getXataClient } from '$lib/server/xata-old';
import { parseSettingsTbl } from '$lib/utils.js';
import type { Settings } from '$types';

import { getSettingsManager, type SettingsManager as SM } from '$lib/settingsManager';

const xata = getXataClient();

let settings: Settings;

// TODO: svelte stores are not meant to be used in server-side code
export const initSettings = async () => {
	if (!settings) {
		settings = await getSettings();
	}
	return getSettingsManager(settings);
};

export const getSettings = async (): Promise<Settings> => {
	const settingsTbl = await xata.db.Settings.getAll();
	return parseSettingsTbl(settingsTbl) as Settings;
};

export type SettingsManager = SM