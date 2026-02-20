import type { Settings, SupabaseClient } from '$types';
import {
	getSettingsManager as getSettingsManagerConstructor,
	type SettingsManager as SM
} from '$lib/settingsManager';
import type { Tables } from '$lib/supabase.types';


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
	return Object.values(Object.groupBy(
		settingsTbl as (Tables<'Settings'> & { value: string | string[] | boolean | number })[],
		({ name }) => name)
	)
		.map(nameSettings => {
			const def = nameSettings.find((v) => v.startDate === null && v.endDate === null);
			if (!def) throw Error('Missing default for ' + nameSettings[0].name);
			return {
				_name: def.name,
				default: def.value,
				entries: nameSettings.filter(v => v !== def)
			}
		})
		.reduce((acc, curr) => {
			acc[curr._name] = curr;
			return acc;
		}, {} as Settings)
}

export type SettingsManager = SM;
