import type { Users, Buoys } from './lib/server/xata.codegen';

export type Reservation = {
	id: string;
	owTime: OWTime;
	resType: ReservationType;
	numStudents: number;
	maxDepth: number;
	comments: string;
	user: Users;
	startTime: string;
	endTime: string;
	category: ReservationCategory;
	createdAt: Date;
	date: string;
	owner: boolean;
	buddies: string[];
	status: ReservationStatus;
	pulley: boolean;
	extraBottomWeight: boolean;
	bottomPlate: boolean;
	largeBuoy: boolean;
	lanes: string[];
	O2OnBuoy: boolean;
	buoy: string;
	room: string;
	price: number;
	updatedAt: Date;
};

export interface BuddyData {
	name: string;
	userId?: string;
	id?: number;
	matches?: any[];
}

export type ReservationPeriod = 'upcoming' | 'past';

export enum OWTime {
	AM = 'AM',
	PM = 'PM'
}

export enum ReservationType {
	autonomous = 'autonomous',
	course = 'course',
	cbs = 'cbs'
}

export enum ReservationCategory {
	openwater = 'openwater',
	pool = 'pool',
	classroom = 'classroom'
}

export enum ReservationStatus {
	confirmed = 'confirmed',
	pending = 'pending',
	rejected = 'rejected',
	canceled = 'canceled'
}

export type SettingEntryString = {
	startDate: string;
	endDate: string;
	value: string;
};
export type SettingEntryStringArr = {
	startDate: string;
	endDate: string;
	value: string[];
};
export type SettingEntryInt = {
	startDate: string;
	endDate: string;
	value: number;
};
export type SettingEntryBool = {
	startDate: string;
	endDate: string;
	value: boolean;
};

export type SettingString = {
	default: string;
	entries: SettingEntryString[];
};
export type SettingStringArr = {
	default: string[];
	entries: SettingEntryStringArr[];
};
export type SettingInt = {
	default: number;
	entries: SettingEntryInt[];
};
export type SettingBool = {
	default: boolean;
	entries: SettingEntryBool[];
};

export type Setting = SettingString | SettingStringArr | SettingInt | SettingBool;
export type Settings = { [key: string]: Setting };
export type SettingsStore = {
	getBoats: (date?: string) => string[];
	getCancelationCutOffTime: (date?: string) => string;
	getCbsAvailable: (date?: string) => boolean;
	getClassroomBookable: (date?: string) => boolean;
	getClassroomLabel: (date?: string) => string;
	getClassrooms: (date?: string) => string[];
	getMaxChargeableOWPerMonth: (date?: string) => number;
	getMaxClassroomEndTime: (date?: string) => string;
	getMaxOccupantsPerLane: (date?: string) => number;
	getMaxPoolEndTime: (date?: string) => string;
	getMinClassroomStartTime: (date?: string) => string;
	getMinPoolStartTime: (date?: string) => string;
	getOpenForBusiness: (date?: string) => boolean;
	getOpenwaterAmBookable: (date?: string) => boolean;
	getOpenwaterAmEndTime: (date?: string) => string;
	getOpenwaterAmStartTime: (date?: string) => string;
	getOpenwaterPmBookable: (date?: string) => boolean;
	getOpenwaterPmEndTime: (date?: string) => string;
	getOpenwaterPmStartTime: (date?: string) => string;
	getPoolBookable: (date?: string) => boolean;
	getPoolLabel: (date?: string) => string;
	getPoolLanes: (date?: string) => string[];
	getRefreshIntervalSeconds: (date?: string) => number;
	getReservationCutOffTime: (date?: string) => string;
	getReservationIncrement: (date?: string) => string;
	getReservationLeadTimeDays: (date?: string) => number;
};

export type Buoy = Required<Buoys>;
