import { getYYYYMMDD } from './datetimeUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';
import dayjs from 'dayjs';

export const ow_am_full = "ow_am_full";

export interface DateSetting {
	[ow_am_full]: boolean;
}

export const defaultDateSettings: DateSetting = {
	[ow_am_full]: false
};

export const ow_am_full_default = false;

export async function getDateSetting(supabase: SupabaseClient<Database>, date: Date | string): Promise<[DateSetting, number]> {
	const dt = getYYYYMMDD(date);
	const { data } = await supabase
		.from("DaySettings")
		.select("key, value, updatedAt")
		.eq("date", dt)
		.throwOnError()
	if (data.length === 0) {
		return [defaultDateSettings, 0];
	} else {
		let updatedAtMax = dayjs(0);
		const settings = { ...defaultDateSettings };
		for (const { key, value, updatedAt } of data) {
			// @ts-expect-error Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ ow_am_full: boolean; }'.
			settings[key] = JSON.parse(value);
			const updatedAtJS = dayjs(updatedAt)
			if (updatedAtJS > updatedAtMax) updatedAtMax = updatedAtJS;
		}
		return [settings, updatedAtMax.toDate().valueOf()];
	}
}
