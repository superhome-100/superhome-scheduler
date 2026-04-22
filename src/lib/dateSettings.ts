import type { SupabaseClient } from '$types';
import { markTableAsDirty } from './client/supabase_event_source';
import { getYYYYMMDD } from './datetimeUtils';
import type { Json } from './supabase.types';

export const ow_am_full = "ow_am_full";
export const ow_pm_full = "ow_pm_full";

export interface DaySettings {
	[ow_am_full]: boolean;
	[ow_pm_full]: boolean;
}

export const defaultDateSettings: DaySettings = {
	[ow_am_full]: false,
	[ow_pm_full]: false,
};

export async function getDaySettings(supabase: SupabaseClient, date: Date | string): Promise<DaySettings> {
	const dt = getYYYYMMDD(date);
	const { data } = await supabase
		.from("DaySettings")
		.select("key, value")
		.eq("date", dt)
		.throwOnError()
	const settings = { ...defaultDateSettings };
	for (const { key, value } of data) {
		// @ts-expect-error Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ ow_am_full: boolean; }'.
		settings[key] = value;
	}
	return settings;
}

export async function setDaySetting(supabase: SupabaseClient, date: Date | string, key: keyof DaySettings, value: Json) {
	const dt = getYYYYMMDD(date);
	await supabase
		.from("DaySettings")
		.upsert({ date: dt, key, value })
		.select("key")
		.single() // this way it throws if no row returned
		.throwOnError();
	markTableAsDirty('DaySettings');
}
