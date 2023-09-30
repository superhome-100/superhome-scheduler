import { settings } from '../stores';
import { get } from 'svelte/store';
import type { Setting } from '$types';
import { getSettingsManager, type SettingsManager } from '../settingsManager';

export const getOn = (setting: Setting, date?: string) => {
	let val = setting.default;
	if (date !== undefined) {
		for (let entry of setting.entries) {
			if (entry.startDate <= date && date <= entry.endDate) {
				val = entry.value;
				break;
			}
		}
	}
	return val;
};

export type SettingsStore = SettingsManager;

// does this actually get initiallized correctly?
export let Settings = getSettingsManager(get(settings));

// TODO: this is absolutely wrong, but its a hack for now.
settings.subscribe((newSettings) => {
	Settings = getSettingsManager(newSettings);
})