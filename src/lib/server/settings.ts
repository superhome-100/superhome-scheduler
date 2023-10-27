import { getXataClient } from '$lib/server/xata-old';
import type { Setting, Settings } from '$types';

import { getSettingsManager, type SettingsManager as SM } from '$lib/settingsManager';
import type { SettingsRecord } from './xata.codegen';
import type { SelectedPick } from '@xata.io/client';

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
	return parseSettingsTbl(settingsTbl);
};

export function parseSettingsTbl(
	settingsTbl: Readonly<SelectedPick<SettingsRecord, ['*']>>[]
): Settings {
	let settings: { [key: string]: Setting } = {};
	let fields = new Set(settingsTbl.map((e) => e.name));

	let fixTypes = (e: SelectedPick<SettingsRecord, ['*']>) => {
		let name = e.name!;
		let v: any = e.value!;
		if (
			['maxChargeableOWPerMonth', 'refreshIntervalSeconds', 'reservationLeadTimeDays'].includes(
				name
			)
		) {
			v = parseInt(v);
		}
		if (name === 'refreshIntervalSeconds') {
			name = 'refreshInterval';
			v = v * 1000;
		}
		if (
			[
				'cbsAvailable',
				'classroomBookable',
				'openForBusiness',
				'openwaterAmBookable',
				'openwaterPmBookable',
				'poolBookable'
			].includes(name)
		) {
			v = v === 'true';
		}
		if (['poolLanes', 'classrooms', 'boats', 'captains'].includes(name)) {
			v = v.split(';');
		}

		return {
			...e,
			name,
			value: v
		};
	};

	fields.forEach((field) => {
		let entries = settingsTbl.filter((e) => e.name === field).map((e) => fixTypes(e));
		let def = entries.splice(
			entries.findIndex((e) => e.startDate === 'default'),
			1
		)[0];
		if (def.name) {
			settings[def.name] = {
				default: def.value!,
				entries
			};
		}
	});
	return settings as Settings;
}

export type SettingsManager = SM;
