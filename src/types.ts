import type { Users, Buoys, ReservationsRecord } from './lib/server/xata.codegen';
import type { SelectedPick } from '@xata.io/client';

export type ReservationXata = SelectedPick<ReservationsRecord, ['*']>;

export type Submission = {
	user: { id: string };
	date: string;
	category: ReservationCategory;
	resType: ReservationType;
	buddies: string[];
	comments: string;
	numStudents: number;
	startTime: string;
	endTime: string;
	owTime: OWTime;
	maxDepth: number;
	pulley: boolean | null;
	extraBottomWeight: boolean;
	bottomPlate: boolean;
	largeBuoy: boolean;
	O2OnBuoy: boolean;
	owner: boolean;
	status: ReservationStatus;
	lanes: string[];
	buoy: string;
};

export type Reservation = Submission & {
	id: string;
	createdAt?: Date;
	room: string;
	price?: number;
	updatedAt?: Date;
};

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

export type Buoy = Required<Buoys>;

export interface BuddyData {
	name: string;
	userId?: string;
	id?: number;
	matches?: any[];
}

export type AppFormData = {
	get: (prop: string) => string;
	has: (prop: string) => boolean;
};

// if there are new setting type add it here
export enum SettingTypes {
	boats = 'boats',
	cancelationCutOffTime = 'cancelationCutOffTime',
	cbsAvailable = 'cbsAvailable',
	classroomBookable = 'classroomBookable',
	classroomLabel = 'classroomLabel',
	classrooms = 'classrooms',
	maxChargeableOWPerMonth = 'maxChargeableOWPerMonth',
	maxClassroomEndTime = 'maxClassroomEndTime',
	maxOccupantsPerLane = 'maxOccupantsPerLane',
	maxPoolEndTime = 'maxPoolEndTime',
	minClassroomStartTime = 'minClassroomStartTime',
	minPoolStartTime = 'minPoolStartTime',
	openForBusiness = 'openForBusiness',
	openwaterAmBookable = 'openwaterAmBookable',
	openwaterAmEndTime = 'openwaterAmEndTime',
	openwaterAmStartTime = 'openwaterAmStartTime',
	openwaterPmBookable = 'openwaterPmBookable',
	openwaterPmEndTime = 'openwaterPmEndTime',
	openwaterPmStartTime = 'openwaterPmStartTime',
	poolBookable = 'poolBookable',
	poolLabel = 'poolLabel',
	poolLanes = 'poolLanes',
	refreshIntervalSeconds = 'refreshIntervalSeconds',
	reservationCutOffTime = 'reservationCutOffTime',
	reservationIncrement = 'reservationIncrement',
	reservationLeadTimeDays = 'reservationLeadTimeDays'
}

export type Setting = {
	default: string | string[] | boolean | number;
	entries: {
		startDate: string; // yyyy-mm-dd
		endDate: string; // yyyy-mm-dd
		id: string;
		name: string;
		value: string | string[] | boolean | number;
	}[];
};

export type Settings = {
	[key in SettingTypes]: Setting;
};
