import type { Settings, Setting } from '$types';

const getOn = (setting: Setting, date?: string) => {
	if (date !== undefined) {
		for (const e of setting.entries) {
			if ((e.startDate === null || e.startDate <= date) && (e.endDate === null || date <= e.endDate)) {
				return e.value;
			}
		}
	}
	return setting.default;
};

export const getSettingsManager = (settings: Settings) => {
	const settingsManager = {
		getSettings: () => {
			return settings;
		},
		getBoats: (date?: string) => {
			return <string[]>getOn(settings.boats, date);
		},
		getCancelationCutOffTime: (date?: string) => {
			return <string>getOn(settings.cancelationCutOffTime, date);
		},
		getCbsAvailable: (date?: string) => {
			return <boolean>getOn(settings.cbsAvailable, date);
		},
		getClassroomBookable: (date?: string) => {
			return <boolean>getOn(settings.classroomBookable, date);
		},
		getClassroomLabel: (date?: string) => {
			return <string>getOn(settings.classroomLabel, date);
		},
		getClassrooms: (date?: string) => {
			return <string[]>getOn(settings.classrooms, date);
		},
		getMaxChargeableOWPerMonth: (date?: string) => {
			return <number>getOn(settings.maxChargeableOWPerMonth, date);
		},
		getMaxClassroomEndTime: (date?: string) => {
			return <string>getOn(settings.maxClassroomEndTime, date);
		},
		getMaxPoolEndTime: (date?: string) => {
			return <string>getOn(settings.maxPoolEndTime, date);
		},
		getMinClassroomStartTime: (date?: string) => {
			return <string>getOn(settings.minClassroomStartTime, date);
		},
		getMinPoolStartTime: (date?: string) => {
			return <string>getOn(settings.minPoolStartTime, date);
		},
		getOpenForBusiness: (date?: string) => {
			return <boolean>getOn(settings.openForBusiness, date);
		},
		getOpenwaterAmBookable: (date?: string) => {
			return <boolean>getOn(settings.openwaterAmBookable, date);
		},
		getOpenwaterAmEndTime: (date?: string) => {
			return <string>getOn(settings.openwaterAmEndTime, date);
		},
		getOpenwaterAmStartTime: (date?: string) => {
			return <string>getOn(settings.openwaterAmStartTime, date);
		},
		getOpenwaterPmBookable: (date?: string) => {
			return <boolean>getOn(settings.openwaterPmBookable, date);
		},
		getOpenwaterPmEndTime: (date?: string) => {
			return <string>getOn(settings.openwaterPmEndTime, date);
		},
		getOpenwaterPmStartTime: (date?: string) => {
			return <string>getOn(settings.openwaterPmStartTime, date);
		},
		getPoolBookable: (date?: string) => {
			return <boolean>getOn(settings.poolBookable, date);
		},
		getPoolLabel: (date?: string) => {
			return <string>getOn(settings.poolLabel, date);
		},
		getPoolLanes: (date?: string) => {
			return <string[]>getOn(settings.poolLanes, date);
		},
		getReservationCutOffTime: (date?: string) => {
			return <string>getOn(settings.reservationCutOffTime, date);
		},
		getReservationIncrement: (date?: string) => {
			return <string>getOn(settings.reservationIncrement, date);
		},
		getReservationLeadTimeDays: (date?: string) => {
			return <number>getOn(settings.reservationLeadTimeDays, date);
		}
	};
	return settingsManager;
};

export type SettingsManager = ReturnType<typeof getSettingsManager>;
