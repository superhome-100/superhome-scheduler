import type { Reservations } from './lib/server/xata';

export type ReservationData = Omit<Reservations, 'category'> & {
	category: ReservationCategory;
};

export enum ReservationCategory {
	openwater,
	pool,
	classroom
}
