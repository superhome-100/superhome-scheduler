import type { ReservationType } from '../services/reservationService';

/**
 * Cut-off rules configuration for different reservation types
 */
export const CUTOFF_RULES = {
  open_water: {
    cutoffTime: '18:00', // 6 PM
    description: 'Open water reservations must be made before 6 PM for next day'
  },
  pool: {
    cutoffMinutes: 30,
    description: 'Pool reservations must be made at least 30 minutes in advance'
  },
  classroom: {
    cutoffMinutes: 30,
    description: 'Classroom reservations must be made at least 30 minutes in advance'
  }
} as const;

/**
 * Get the cutoff time for a specific reservation type and date
 */
export function getCutoffTime(
  res_type: ReservationType, 
  reservationDate: string
): Date {
  const cutoffRules = CUTOFF_RULES[res_type];
  const resDate = new Date(reservationDate);
  
  if (res_type === 'open_water') {
    // 6 PM local time on the day before the reservation
    const cutoffDate = new Date(resDate);
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    cutoffDate.setHours(18, 0, 0, 0); // Use local time instead of UTC
    return cutoffDate;
  } else {
    // 30 minutes before reservation time
    const cutoffTime = new Date(resDate);
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 30);
    return cutoffTime;
  }
}

/**
 * Check if current time is before the cutoff time
 */
export function isBeforeCutoff(
  reservationDate: string,
  res_type: ReservationType
): boolean {
  const resDate = new Date(reservationDate);
  const now = new Date();
  
  // For open water, check if it's same day (not allowed)
  if (res_type === 'open_water') {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const reservationDay = new Date(resDate);
    reservationDay.setHours(0, 0, 0, 0);
    
    // If trying to book same day, it's invalid
    if (reservationDay.getTime() === today.getTime()) {
      return false;
    }
  }
  
  const cutoffTime = getCutoffTime(res_type, reservationDate);
  return now < cutoffTime;
}

/**
 * Format cutoff time for display
 */
export function formatCutoffTime(cutoffTime: Date): string {
  return cutoffTime.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get cutoff description for a reservation type
 */
export function getCutoffDescription(res_type: ReservationType): string {
  return CUTOFF_RULES[res_type].description;
}

/**
 * Calculate time remaining until cutoff
 */
export function getTimeUntilCutoff(
  reservationDate: string,
  res_type: ReservationType,
  startTime?: string
): { hours: number; minutes: number; totalMinutes: number } {
  const now = new Date();
  let cutoffTime: Date;
  
  if (res_type === 'open_water') {
    // For open water, use the fixed 6 PM cutoff
    cutoffTime = getCutoffTime(res_type, reservationDate);
  } else {
    // For pool and classroom, calculate based on start time minus 30 minutes
    if (startTime) {
      const reservationDateTime = new Date(`${reservationDate}T${startTime}`);
      cutoffTime = new Date(reservationDateTime);
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 30);
    } else {
      // If no start time provided, use current time + 30 minutes as a fallback
      cutoffTime = new Date(now);
      cutoffTime.setMinutes(cutoffTime.getMinutes() + 30);
    }
  }
  
  const diffMs = cutoffTime.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }
  
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return { hours, minutes, totalMinutes };
}

/**
 * Helpers for modification vs cancellation cutoffs
 * These mirror legacy behavior:
 * - Modification cutoff:
 *   - Pool/Classroom: any time before the reservation start time
 *   - Open Water: 6 PM the day before
 * - Cancellation cutoff:
 *   - Pool/Classroom: at least 60 minutes before start
 *   - Open Water: 6 PM the day before (approximation without per-day settings)
 */
export function isBeforeModificationCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): boolean {
  const now = new Date();
  if (res_type === 'open_water') {
    // Determine day/time using timeOfDay when provided
    const base = new Date(reservationDateISO);
    if (timeOfDay) {
      const datePart = new Date(base);
      const dayISO = `${datePart.toISOString().slice(0,10)}`;
      const t = timeOfDay === 'PM' ? '13:00' : '08:00';
      const dt = new Date(`${dayISO}T${t}:00.000Z`);
      return now < getCutoffTime('open_water', dt.toISOString());
    }
    return now < getCutoffTime('open_water', reservationDateISO);
  }
  // Pool/Classroom: 30 minutes before actual start time
  if (!startTime) return true; // if unknown, be permissive for UI
  const dt = new Date(`${new Date(reservationDateISO).toISOString().slice(0,10)}T${startTime}`);
  const cutoff = new Date(dt);
  cutoff.setMinutes(cutoff.getMinutes() - 30);
  return now < cutoff;
}

export function isBeforeCancelCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): boolean {
  const now = new Date();
  if (res_type === 'open_water') {
    // Approximate to 6 PM the day before without settings manager
    const baseISO = (() => {
      if (timeOfDay) {
        const day = new Date(reservationDateISO).toISOString().slice(0,10);
        const t = timeOfDay === 'PM' ? '13:00' : '08:00';
        return new Date(`${day}T${t}:00.000Z`).toISOString();
      }
      return reservationDateISO;
    })();
    return now < getCutoffTime('open_water', baseISO);
  }
  // Pool/Classroom: 60 minutes before start
  if (!startTime) {
    // If start time is unknown in the client context, allow the cancel action
    // and let the server perform the authoritative cutoff validation.
    return true;
  }
  const day = new Date(reservationDateISO).toISOString().slice(0,10);
  const start = new Date(`${day}T${startTime}`);
  const cancelCutoff = new Date(start);
  cancelCutoff.setMinutes(cancelCutoff.getMinutes() - 60);
  return now < cancelCutoff;
}

export type EditPhase = 'flexible' | 'restricted' | 'locked';

/**
 * Compute the current edit phase relative to modification and cancel cutoffs.
 * phases:
 * - flexible: can cancel and modify
 * - restricted: cannot cancel, can modify
 * - locked: cannot cancel, cannot modify
 */
export function getEditPhase(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): EditPhase {
  const canCancel = isBeforeCancelCutoff(res_type, reservationDateISO, startTime, timeOfDay);
  const canModify = isBeforeModificationCutoff(res_type, reservationDateISO, startTime, timeOfDay);

  if (canCancel && canModify) return 'flexible';
  if (!canCancel && canModify) return 'restricted';
  return 'locked';
}
