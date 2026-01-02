import { isBeforeCancelCutoff } from './cutoffRules';
import type { ReservationType } from '../services/reservationService';

export interface CancelCheckResult {
  canCancel: boolean;
  message?: string;
}

/**
 * Extracts normalized reservation data needed for cutoff checks from various reservation object shapes.
 * Handles both raw Supabase rows and UnifiedReservation objects.
 */
export function getReservationCutoffData(reservation: any) {
  if (!reservation) return null;

  const r = reservation;
  
  // Identify reservation type
  const type = (r.res_type ||
    (r.type === "Open Water"
      ? "open_water"
      : r.type === "Pool"
        ? "pool"
        : r.type === "Classroom"
          ? "classroom"
          : r.res_type)) as ReservationType;

  // Identify start time - watch out for "AM"/"PM" being stored in startTime field in unified objects
  let start_time =
    r?.res_pool?.start_time ||
    r?.res_classroom?.start_time ||
    r?.start_time ||
    r?.startTime ||
    undefined;

  // Identify time period (AM/PM)
  const time_period = (r?.res_openwater?.time_period || r?.time_period || r?.timeOfDay) as
    | "AM"
    | "PM"
    | undefined;

  // If start_time is accidentally "AM" or "PM" (common for unified OW objects), clear it
  // and ensure we rely on time_period.
  if (start_time === "AM" || start_time === "PM") {
    start_time = undefined;
  }

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
