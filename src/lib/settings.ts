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

export const getSettings = async (supabase: SupabaseClient): Promise<Settings> => {
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
		const name = e.name;
		const v = e.value as string | string[] | boolean | number;
		return {
			...e,
			name,
			value: v
		};
	};

	fields.forEach((field) => {
		let entries = settingsTbl.filter((e) => e.name === field).map((e) => fixTypes(e));
		let def = entries.splice(
			entries.findIndex((e) => e.startDate === null),
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
