import type { Setting, Settings, SupabaseClient } from '$types';
import {
	getSettingsManager as getSettingsManagerConstructor,
	type SettingsManager as SM
} from '$lib/settingsManager';
import type { Tables } from '$lib/supabase.types';

let settings: Settings;

// TODO: svelte stores are not meant to be used in server-side code
export const initSettings = async (supabase: SupabaseClient) => {
	if (!settings) {
		settings = await getSettings(supabase);
	}
	return getSettingsManagerConstructor(settings);
};

const getSettings = async (supabase: SupabaseClient): Promise<Settings> => {
	const { data: settingsTbl } =
		await supabase
			.from('Settings')
			.select('*')
			.throwOnError();
	return parseSettingsTbl(settingsTbl);
};

export const getSettingsManager = async (supabase: SupabaseClient): Promise<SettingsManager> => {
	const s = await getSettings(supabase);
	return await getSettingsManagerConstructor(s);
};

function parseSettingsTbl(settingsTbl: Tables<'Settings'>[]): Settings {
	const settings: { [key: string]: Setting } = {};
	const fields = new Set(settingsTbl.map((e) => e.name));

	let fixTypes = (e: Tables<'Settings'>) => {
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
