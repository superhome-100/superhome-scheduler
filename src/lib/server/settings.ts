import { getXataClient } from '$lib/server/xata-old';
import { parseSettingsTbl } from '$lib/utils.js';
import { settings } from '$lib/stores';
import { get } from 'svelte/store';
import type { Setting } from '$types';

const xata = getXataClient();

// TODO: svelte stores are not meant to be used in server-side code
export const initSettings = async () => {
	if (Object.keys(get(settings)).length === 0) {
		settings.set(await getSettings());
	}
};

export const getSettings = async (): Promise<{ [key: string]: Setting }> => {
	const settingsTbl = await xata.db.Settings.getAll();
	return parseSettingsTbl(settingsTbl) as { [key: string]: Setting };
};
