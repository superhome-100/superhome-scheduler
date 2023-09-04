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
