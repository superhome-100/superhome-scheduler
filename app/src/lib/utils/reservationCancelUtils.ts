import { isBeforeCancelCutoff } from './cutoffRules';
import type { ReservationType } from '../services/reservationService';

export interface CancelCheckResult {
  canCancel: boolean;
  message?: string;
}

/**
 * Extracts normalized reservation data needed for cutoff checks from various reservation object shapes.
 */
export function getReservationCutoffData(reservation: any) {
  if (!reservation) return null;

  const r = reservation;
  const type = (r.res_type ||
    (r.type === "Open Water"
      ? "open_water"
      : r.type === "Pool"
        ? "pool"
        : r.type === "Classroom"
          ? "classroom"
          : r.res_type)) as ReservationType;

  const start_time =
    r?.res_pool?.start_time ||
    r?.res_classroom?.start_time ||
    r?.start_time ||
    r?.startTime ||
    undefined;

  const time_period = (r?.res_openwater?.time_period || r?.time_period || r?.timeOfDay) as
    | "AM"
    | "PM"
    | undefined;

  const res_date = r.res_date || r.date;

  return { type, res_date, start_time, time_period };
}

/**
 * Centralized logic to check if a reservation can be cancelled based on business rules.
 */
export function checkCancellationAvailability(reservation: any): CancelCheckResult {
  const data = getReservationCutoffData(reservation);
  if (!data) return { canCancel: false };

  const { type, res_date, start_time, time_period } = data;

  if (!isBeforeCancelCutoff(type, res_date, start_time, time_period)) {
    return {
      canCancel: false,
      message: "Unable to cancel. The cancellation cutoff time has already passed."
    };
  }

  return { canCancel: true };
}
