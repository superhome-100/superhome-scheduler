import type { Reservations } from './lib/server/xata';

export type ReservationData = Omit<Reservations, 'category' | 'status'> & {
	category: ReservationCategory;
	status: ReservationStatus;
};

export enum ReservationCategory {
	openwater,
	pool,
	classroom
}

export interface BuddyData {
	name: string;
	userId?: string;
	id?: number;
	matches?: any[];
}

export enum ReservationStatus {
	pending,
	confirmed,
	rejected
}
