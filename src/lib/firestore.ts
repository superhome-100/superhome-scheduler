import { getYYYYMMDD } from './datetimeUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase.types';
import dayjs from 'dayjs';
import { supabase_es } from './client/supabase_event_source';

export const ow_am_full = "ow_am_full";

export interface DateSetting {
	[ow_am_full]: boolean;
}

const defaultDateSettings: DateSetting = {
	[ow_am_full]: false
};

export const ow_am_full_default = false;


export async function flagOWAmAsFull(date: Date, state: boolean) {
	await fetch(`/api/admin/setting/${getYYYYMMDD(date)}/${ow_am_full}/set`, {
		method: 'PUT',
		body: JSON.stringify(state)
	});
}


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

export function listenToDateSetting(supabase: SupabaseClient<Database>, date: Date, cb: (setting: DateSetting) => void) {
	const p = async () => {
		const [settings] = await getDateSetting(supabase, date);
		cb(settings);
	};
	p(); // legacy working, has to call it once
	return supabase_es.subscribe(p, "DaySettings");
}


export function listenOnDateUpdate(date?: Date = undefined, category?: string = undefined, cb: () => void) {
	// Before doTransaction modified the lock which resulted in a callback.
	// Now the table change event arrives and does the trick.
	// And since we know that doTransaction was only used for reservations it is enough to listen on changes or that table
	return supabase_es.subscribe(cb, "Reservations", "DaySettings");
}
