// Reusable reservation-related types
// Keep values aligned with UI segments and DB mapping logic

export enum ReservationType {
  openwater = 'openwater',
  pool = 'pool',
  classroom = 'classroom',
}

export type ReservationTypeLiteral = `${ReservationType}`;
