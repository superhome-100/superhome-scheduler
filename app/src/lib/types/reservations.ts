// Reusable reservation-related types
// Keep values aligned with UI segments and DB mapping logic

export enum ReservationType {
  openwater = 'openwater',
  pool = 'pool',
  classroom = 'classroom',
}

export type ReservationTypeLiteral = `${ReservationType}`;

// DB-aligned reservation type (does not change existing UI enum to avoid breaking changes)
// Database enum values are defined in public.enums.reservation_type as 'pool' | 'open_water' | 'classroom'
// Import the generated type to ensure strictness and single source of truth
import type { Enums } from '../database.types';

export type DbReservationType = Enums<'reservation_type'>; // 'pool' | 'open_water' | 'classroom'

// Converters between UI ReservationType and DB reservation_type values
export function toDbReservationType(rt: ReservationType): DbReservationType {
  switch (rt) {
    case ReservationType.pool:
      return 'pool';
    case ReservationType.classroom:
      return 'classroom';
    case ReservationType.openwater:
    default:
      return 'open_water';
  }
}

export function fromDbReservationType(db: DbReservationType): ReservationType {
  switch (db) {
    case 'pool':
      return ReservationType.pool;
    case 'classroom':
      return ReservationType.classroom;
    case 'open_water':
    default:
      return ReservationType.openwater;
  }
}
