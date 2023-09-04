import { settings } from './stores';
import { get } from 'svelte/store';

type SettingValue = string | string[] | number | boolean;
type SettingEntry = {
	startDate: string;
	endDate: string;
	value: SettingValue;
};
type Setting = {
	default: SettingValue;
	entries: SettingEntry[];
};

export const getOn = (setting: Setting, date?: string) => {
	let val = setting.default;
	if (date !== undefined) {
		for (let entry of setting.entries) {
			if (entry.startDate <= date && date <= entry.endDate) {
				val = entry.value;
				break;
			}
		}
	}
	return val;
};

export type SettingsStore = typeof Settings;

export const Settings = {
	getBoats: (date?: string) => {
		let setting = get(settings)['boats'];
		return <string[]>getOn(setting, date);
	},
	getCancelationCutOffTime: (date?: string) => {
		let setting = get(settings)['cancelationCutOffTime'];
		return <string>getOn(setting, date);
	},
	getCbsAvailable: (date?: string) => {
		let setting = get(settings)['cbsAvailable'];
		return <boolean>getOn(setting, date);
	},
	getClassroomBookable: (date?: string) => {
		let setting = get(settings)['classroomBookable'];
		return <boolean>getOn(setting, date);
	},
	getClassroomLabel: (date?: string) => {
		let setting = get(settings)['classroomLabel'];
		return <string>getOn(setting, date);
	},
	getClassrooms: (date?: string) => {
		let setting = get(settings)['classrooms'];
		return <string[]>getOn(setting, date);
	},
	getMaxChargeableOWPerMonth: (date?: string) => {
		let setting = get(settings)['maxChargeableOWPerMonth'];
		return <number>getOn(setting, date);
	},
	getMaxClassroomEndTime: (date?: string) => {
		let setting = get(settings)['maxClassroomEndTime'];
		return <string>getOn(setting, date);
	},
	getMaxOccupantsPerLane: (date?: string) => {
		let setting = get(settings)['maxOccupantsPerLane'];
		return <number>getOn(setting, date);
	},
	getMaxPoolEndTime: (date?: string) => {
		let setting = get(settings)['maxPoolEndTime'];
		return <string>getOn(setting, date);
	},
	getMinClassroomStartTime: (date?: string) => {
		let setting = get(settings)['minClassroomStartTime'];
		return <string>getOn(setting, date);
	},
	getMinPoolStartTime: (date?: string) => {
		let setting = get(settings)['minPoolStartTime'];
		return <string>getOn(setting, date);
	},
	getOpenForBusiness: (date?: string) => {
		let setting = get(settings)['openForBusiness'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterAmBookable: (date?: string) => {
		let setting = get(settings)['openwaterAmBookable'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterAmEndTime: (date?: string) => {
		let setting = get(settings)['openwaterAmEndTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterAmStartTime: (date?: string) => {
		let setting = get(settings)['openwaterAmStartTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterPmBookable: (date?: string) => {
		let setting = get(settings)['openwaterPmBookable'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterPmEndTime: (date?: string) => {
		let setting = get(settings)['openwaterPmEndTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterPmStartTime: (date?: string) => {
		let setting = get(settings)['openwaterPmStartTime'];
		return <string>getOn(setting, date);
	},
	getPoolBookable: (date?: string) => {
		let setting = get(settings)['poolBookable'];
		return <boolean>getOn(setting, date);
	},
	getPoolLabel: (date?: string) => {
		let setting = get(settings)['poolLabel'];
		return <string>getOn(setting, date);
	},
	getPoolLanes: (date?: string) => {
		let setting = get(settings)['poolLanes'];
		return <string[]>getOn(setting, date);
	},
	getRefreshIntervalSeconds: (date?: string) => {
		let setting = get(settings)['refreshIntervalSeconds'];
		return <number>getOn(setting, date);
	},
	getReservationCutOffTime: (date?: string) => {
		let setting = get(settings)['reservationCutOffTime'];
		return <string>getOn(setting, date);
	},
	getReservationIncrement: (date?: string) => {
		let setting = get(settings)['reservationIncrement'];
		return <string>getOn(setting, date);
	},
	getReservationLeadTimeDays: (date?: string) => {
		let setting = get(settings)['reservationLeadTimeDays'];
		return <number>getOn(setting, date);
	}
};
