import type { AssertEqual, SupabaseClient } from '$types';
import type { Enums, Tables } from '$lib/supabase.types';

/**
 * If this is error: Indicates that the ValueMap should be updated as well.
 * Should be in sync with [definition and constraint](../../supabase/migrations/20260101000011_create_Settings.sql).
 */
type SettingName = Enums<'setting_name'>;
/**
 * If this is error: Indicates that the ValueMap should be updated as well.
 * Should be in sync with [definition and constraint](../../supabase/migrations/20260101000011_create_Settings.sql).
 */
interface ValueMap {
	'classroomLabel': string;
	'poolLabel': string;
	// ) THEN jsonb_typeof("value") = 'string'

	'cancelationCutOffTime': string; // "HH:mm"
	'maxClassroomEndTime': string; // "HH:mm"
	'maxPoolEndTime': string; // "HH:mm"
	'minClassroomStartTime': string; // "HH:mm"
	'minPoolStartTime': string; // "HH:mm"
	'openwaterAmEndTime': string; // "HH:mm"
	'openwaterAmStartTime': string; // "HH:mm"
	'openwaterPmEndTime': string; // "HH:mm"
	'openwaterPmStartTime': string; // "HH:mm"
	'reservationCutOffTime': string; // "HH:mm"
	'reservationIncrement': string; // "HH:mm"
	// ) THEN jsonb_typeof("value") = 'string' AND ("value" #>> '{}') ~ '^\d?\d:\d\d$' -- '"HH:mm"'

	'maxChargeableOWPerMonth': number;
	'reservationLeadTimeDays': number;
	// ) THEN jsonb_typeof("value") = 'number'

	'cbsAvailable': boolean;
	'classroomBookable': boolean;
	'openForBusiness': boolean;
	'openwaterAmBookable': boolean;
	'openwaterPmBookable': boolean;
	'poolBookable': boolean;
	'pushNotificationEnabled': boolean;
	//   ) THEN jsonb_typeof("value") = 'boolean'

	'poolLanes': string[];
	'classrooms': string[];
	'boats': string[];
	// ) THEN jsonb_typeof("value") = 'array'
}
/**
 * Static Assertion:
 * This will fail to compile if ValueMap is missing any key from SettingName.
 * See above.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ValidateSyncLR = AssertEqual<keyof ValueMap, SettingName>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ValidateSyncRL = AssertEqual<SettingName, keyof ValueMap>;

export type Setting<T> = {
	default: T;
	entries: {
		startDate: string | null; // yyyy-mm-dd
		endDate: string | null; // yyyy-mm-dd
		name: string;
		value: T;
	}[];
};

export type Settings = {
	[K in SettingName]: Setting<ValueMap[K]>;
};

export const getSettings = async (supabase: SupabaseClient): Promise<Settings> => {
	const { data: settingsTbl } =
		await supabase
			.from('Settings')
			.select('*')
			.throwOnError();
	return parseSettingsTbl(settingsTbl);
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

export function getSetting<K extends SettingName>(
	settings: Settings,
	name: K,
	date: string,
	defaultValue?: ValueMap[K]
): ValueMap[K] {
	const setting = settings[name] as Setting<ValueMap[K]>;
	if (setting === undefined) {
		if (defaultValue !== undefined) return defaultValue;
		else throw Error(`missing setting ${name}`);
	}
	if (!date) throw Error(`missing date for ${name}`);
	else if (date.match(/\d{4}-\d{2}-\d{2}/) === null) throw Error(`incorrect date for ${name}, ${date}`);
	for (const e of setting.entries) {
		if ((e.startDate === null || e.startDate <= date)
			&& (e.endDate === null || date <= e.endDate)) {
			return e.value;
		}
	}
	return setting.default;
}

export class SettingsManager {
	constructor(private readonly settings: Settings) { }
	get<K extends SettingName>(name: K, date: string, defaultValue?: ValueMap[K]) {
		return getSetting(this.settings, name, date, defaultValue);
	}
	getBoats(date: string) {
		return this.get('boats', date);
	}
	getCancelationCutOffTime(date: string) {
		return this.get('cancelationCutOffTime', date);
	}
	getCbsAvailable(date: string) {
		return this.get('cbsAvailable', date);
	}
	getClassroomBookable(date: string) {
		return this.get('classroomBookable', date);
	}
	getClassroomLabel(date: string) {
		return this.get('classroomLabel', date);
	}
	getClassrooms(date: string) {
		return this.get('classrooms', date);
	}
	getMaxChargeableOWPerMonth(date: string) {
		return this.get('maxChargeableOWPerMonth', date);
	}
	getMaxClassroomEndTime(date: string) {
		return this.get('maxClassroomEndTime', date);
	}
	getMaxPoolEndTime(date: string) {
		return this.get('maxPoolEndTime', date);
	}
	getMinClassroomStartTime(date: string) {
		return this.get('minClassroomStartTime', date);
	}
	getMinPoolStartTime(date: string) {
		return this.get('minPoolStartTime', date);
	}
	getOpenForBusiness(date: string) {
		return this.get('openForBusiness', date);
	}
	getOpenwaterAmBookable(date: string) {
		return this.get('openwaterAmBookable', date);
	}
	getOpenwaterAmEndTime(date: string) {
		return this.get('openwaterAmEndTime', date);
	}
	getOpenwaterAmStartTime(date: string) {
		return this.get('openwaterAmStartTime', date);
	}
	getOpenwaterPmBookable(date: string) {
		return this.get('openwaterPmBookable', date);
	}
	getOpenwaterPmEndTime(date: string) {
		return this.get('openwaterPmEndTime', date);
	}
	getOpenwaterPmStartTime(date: string) {
		return this.get('openwaterPmStartTime', date);
	}
	getPoolBookable(date: string) {
		return this.get('poolBookable', date);
	}
	getPoolLabel(date: string) {
		return this.get('poolLabel', date);
	}
	getPoolLanes(date: string) {
		return this.get('poolLanes', date);
	}
	getReservationCutOffTime(date: string) {
		return this.get('reservationCutOffTime', date);
	}
	getReservationIncrement(date: string) {
		return this.get('reservationIncrement', date);
	}
	getReservationLeadTimeDays(date: string) {
		return this.get('reservationLeadTimeDays', date);
	}
}

export const getSettingsManager = async (supabase: SupabaseClient): Promise<SettingsManager> => {
	const s = await getSettings(supabase);
	return new SettingsManager(s);
};