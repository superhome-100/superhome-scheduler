import type { Setting, SettingsStore } from '$types';
import { settings } from './stores';
import { get } from 'svelte/store';

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

export const Settings: SettingsStore = {
	getBoats: (date?) => {
		let setting = get(settings)['boats'];
		return <string[]>getOn(setting, date);
	},
	getCancelationCutOffTime: (date?) => {
		let setting = get(settings)['cancelationCutOffTime'];
		return <string>getOn(setting, date);
	},
	getCbsAvailable: (date?) => {
		let setting = get(settings)['cbsAvailable'];
		return <boolean>getOn(setting, date);
	},
	getClassroomBookable: (date?) => {
		let setting = get(settings)['classroomBookable'];
		return <boolean>getOn(setting, date);
	},
	getClassroomLabel: (date?) => {
		let setting = get(settings)['classroomLabel'];
		return <string>getOn(setting, date);
	},
	getClassrooms: (date?) => {
		let setting = get(settings)['classrooms'];
		return <string[]>getOn(setting, date);
	},
	getMaxChargeableOWPerMonth: (date?) => {
		let setting = get(settings)['maxChargeableOWPerMonth'];
		return <number>getOn(setting, date);
	},
	getMaxClassroomEndTime: (date?) => {
		let setting = get(settings)['maxClassroomEndTime'];
		return <string>getOn(setting, date);
	},
	getMaxOccupantsPerLane: (date?) => {
		let setting = get(settings)['maxOccupantsPerLane'];
		return <number>getOn(setting, date);
	},
	getMaxPoolEndTime: (date?) => {
		let setting = get(settings)['maxPoolEndTime'];
		return <string>getOn(setting, date);
	},
	getMinClassroomStartTime: (date?) => {
		let setting = get(settings)['minClassroomStartTime'];
		return <string>getOn(setting, date);
	},
	getMinPoolStartTime: (date?) => {
		let setting = get(settings)['minPoolStartTime'];
		return <string>getOn(setting, date);
	},
	getOpenForBusiness: (date?) => {
		let setting = get(settings)['openForBusiness'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterAmBookable: (date?) => {
		let setting = get(settings)['openwaterAmBookable'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterAmEndTime: (date?) => {
		let setting = get(settings)['openwaterAmEndTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterAmStartTime: (date?) => {
		let setting = get(settings)['openwaterAmStartTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterPmBookable: (date?) => {
		let setting = get(settings)['openwaterPmBookable'];
		return <boolean>getOn(setting, date);
	},
	getOpenwaterPmEndTime: (date?) => {
		let setting = get(settings)['openwaterPmEndTime'];
		return <string>getOn(setting, date);
	},
	getOpenwaterPmStartTime: (date?) => {
		let setting = get(settings)['openwaterPmStartTime'];
		return <string>getOn(setting, date);
	},
	getPoolBookable: (date?) => {
		let setting = get(settings)['poolBookable'];
		return <boolean>getOn(setting, date);
	},
	getPoolLabel: (date?) => {
		let setting = get(settings)['poolLabel'];
		return <string>getOn(setting, date);
	},
	getPoolLanes: (date?) => {
		let setting = get(settings)['poolLanes'];
		return <string[]>getOn(setting, date);
	},
	getRefreshIntervalSeconds: (date?) => {
		let setting = get(settings)['refreshIntervalSeconds'];
		return <number>getOn(setting, date);
	},
	getReservationCutOffTime: (date?) => {
		let setting = get(settings)['reservationCutOffTime'];
		return <string>getOn(setting, date);
	},
	getReservationIncrement: (date?) => {
		let setting = get(settings)['reservationIncrement'];
		return <string>getOn(setting, date);
	},
	getReservationLeadTimeDays: (date?) => {
		let setting = get(settings)['reservationLeadTimeDays'];
		return <number>getOn(setting, date);
	}
};
