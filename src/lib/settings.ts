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

	'boats': string[];
	'classrooms': string[];
	'poolLanes': string[];
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

// we just need this in case the server has some problem.
const fallbackValues: ValueMap = {
	"classroomLabel": "classroom",
	"poolLabel": "Slot",

	"cancelationCutOffTime": "1:00",
	"maxClassroomEndTime": "20:00",
	"maxPoolEndTime": "20:00",
	"minClassroomStartTime": "8:00",
	"minPoolStartTime": "8:00",
	"openwaterAmEndTime": "11:00",
	"openwaterAmStartTime": "9:00",
	"openwaterPmEndTime": "16:00",
	"openwaterPmStartTime": "14:00",
	"reservationCutOffTime": "18:00",
	"reservationIncrement": "0:30",

	"maxChargeableOWPerMonth": 12,
	"reservationLeadTimeDays": 30,

	"cbsAvailable": false,
	"classroomBookable": false,
	"openForBusiness": false,
	"openwaterAmBookable": false,
	"openwaterPmBookable": false,
	"poolBookable": false,
	"pushNotificationEnabled": false,

	"boats": ["1", "2", "3", "4"],
	"classrooms": ["3", "2"],
	"poolLanes": ["1", "2", "3", "4", "5", "6", "7", "8"],
}

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

// we chache settings for 10 seconds because it is the most used 
let cachedSettings: Settings | null = null;
let lastFetchSettings = 0;

export async function getCachedSettings(supabase: SupabaseClient): Promise<Settings> {
	const now = Date.now();
	if (!cachedSettings || now - lastFetchSettings > 10000) {
		cachedSettings = await getSettings(supabase);
		lastFetchSettings = now;
	}
	return cachedSettings;
}

export const getSettings = async (supabase: SupabaseClient): Promise<Settings> => {
	const { data: settingsTbl } =
		await supabase
			.from('Settings')
			.select('*')
			.throwOnError();
	return parseSettingsTbl(settingsTbl);
};

function parseSettingsTbl(settingsTbl: Tables<'Settings'>[]): Settings {
	const values = Object.entries(fallbackValues).reduce((acc, [name, _fallback]) => {
		acc[name] = {
			entries: [],
			default: undefined,
			_fallback
		};
		return acc;
	}, {} as Settings);
	for (const s of settingsTbl) {
		const v = values[s.name];
		if (!v) {
			console.warn('unknown/usnused setting name, did you forget to adjust the code?', s.name, s);
			continue;
		}
		if (s.startDate === null && s.endDate === null)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			v.default = s.value as any;
		else
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			v.entries.push(s as any);
	}
	for (const [k, v] of Object.entries(values)) {
		if (v.default === undefined) {
			console.error('setting default is undefined, using fallback', k, v);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(v as Setting<any>).default =
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(v as any)._fallback;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		delete (v as any)._fallback;
	}
	return values;
}

export function getSetting<K extends SettingName>(
	settings: Settings,
	name: K,
	date: string,
): ValueMap[K] {
	const setting = settings[name] as Setting<ValueMap[K]>;
	if (setting === undefined) {
		console.error('missing setting', { name, settings })
		if (fallbackValues[name] !== undefined) return fallbackValues[name];
		throw Error(`missing setting ${name} and defaultValue`);
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
	get<K extends SettingName>(name: K, date: string) {
		return getSetting(this.settings, name, date);
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

export const fallbackSettingsManager = new SettingsManager(
	Object.entries(fallbackValues).reduce((acc, [name, _fallback]) => {
		acc[name] = {
			entries: [],
			default: _fallback,
		};
		return acc;
	}, {} as Settings)
);