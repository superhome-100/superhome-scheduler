import { getYYYYMMDD } from './datetimeUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';

export const ow_am_full = "ow_am_full";

export interface DaySettings {
	[ow_am_full]: boolean;
}

export const defaultDateSettings: DaySettings = {
	[ow_am_full]: false
};

export const ow_am_full_default = false;

export async function getDaySettings(supabase: SupabaseClient<Database>, date: Date | string): Promise<DaySettings> {
	const dt = getYYYYMMDD(date);
	const { data } = await supabase
		.from("DaySettings")
		.select("key, value")
		.eq("date", dt)
		.throwOnError()
	if (data.length === 0) {
		return defaultDateSettings;
	} else {
		const settings = { ...defaultDateSettings };
		for (const { key, value } of data) {
			// @ts-expect-error Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ ow_am_full: boolean; }'.
			settings[key] = value;
		}
		return settings;
	}
}
