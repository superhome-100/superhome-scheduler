import { getXataClient } from '$lib/server/xata-old';
import { parseSettingsTbl } from '$lib/utils.js';
import { settings } from '$lib/stores';
import { get } from 'svelte/store';

const xata = getXataClient();

export const initSettings = async () => {
	if (get(settings) == {}) {
		settings.set(await getSettings());
	}
};

export const getSettings = async () => {
	const settingsTbl = await xata.db.Settings.getAll();
	return parseSettingsTbl(settingsTbl);
};
