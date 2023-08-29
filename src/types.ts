import type { Reservations, Buoys } from './lib/server/xata.codegen';

export type ReservationData = Omit<Reservations, 'category' | 'status'> & {
	category: ReservationCategory;
	status: ReservationStatus;
	endTime: string;
};

export enum ReservationCategory {
	openwater = 'openwater',
	pool = 'pool',
	classroom = 'classroom'
}

export interface BuddyData {
	name: string;
	userId?: string;
	id?: number;
	matches?: any[];
}

export enum ReservationStatus {
	pending = 'pending',
	confirmed = 'confirmed',
	rejected = 'rejected'
}

export type ReservationPeriod = 'upcoming' | 'past';

// TODO: seems to be unrelated to Settings type from xata
export type Setting = {
	// TODO: fix type remove any
	default: any;
	entries: any[];
};

export type Buoy = Required<Buoys>;
