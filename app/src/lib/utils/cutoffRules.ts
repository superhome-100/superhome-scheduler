import type { ReservationType } from '../services/reservationService';

/**
 * Cut-off rules configuration for different reservation types
 */
import { getSettings } from '../stores/settingsStore';

/**
 * Cut-off rules configuration for different reservation types
 */
export const getCutoffRules = () => {
  const settings = getSettings();
  return {
    open_water: {
      cutoffTime: settings.reservationCutOffTimeOW || '18:00',
      description: 'Open water reservations must be made before 6 PM for next day'
    },
    pool: {
      cutoffMinutes: settings.reservationCutOffTimePOOL ?? 30,
      description: `Pool reservations must be made at least ${settings.reservationCutOffTimePOOL ?? 30} minutes in advance`
    },
    classroom: {
      cutoffMinutes: settings.reservationCutOffTimeCLASSROOM ?? 30,
      description: `Classroom reservations must be made at least ${settings.reservationCutOffTimeCLASSROOM ?? 30} minutes in advance`
    }
  };
};

// For backward compatibility and static descriptions
export const CUTOFF_RULES = {
  open_water: { description: 'Open water reservations must be made before 6 PM for next day' },
  pool: { description: 'Pool reservations must be made at least 30 minutes in advance' },
  classroom: { description: 'Classroom reservations must be made at least 30 minutes in advance' }
} as const;


/**
 * Get the cutoff time for a specific reservation type and date
 */
export function getCutoffTime(
  res_type: ReservationType, 
  reservationDate: string
): Date {
  const rules = getCutoffRules();
  const resDate = new Date(reservationDate);
  
  if (res_type === 'open_water') {
    // 6 PM local time on the day before the reservation
    const cutoffDate = new Date(resDate);
    cutoffDate.setDate(cutoffDate.getDate() - 1);
    const [hours, minutes] = (rules.open_water.cutoffTime as string).split(':').map(Number);
    cutoffDate.setHours(hours || 18, minutes || 0, 0, 0); 
    return cutoffDate;
  } else {
    // X minutes before reservation time
    const cutoffTime = new Date(resDate);
    const minutes = Number(rules[res_type].cutoffMinutes);
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);
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
  
  const rules = getCutoffRules();
  if (res_type === 'open_water') {
    // For open water, use the fixed 6 PM cutoff
    cutoffTime = getCutoffTime(res_type, reservationDate);
  } else {
    // For pool and classroom, calculate based on start time minus X minutes
    const cutoffMinutes = Number(rules[res_type].cutoffMinutes);
    if (startTime) {
      const reservationDateTime = new Date(`${reservationDate}T${startTime}`);
      cutoffTime = new Date(reservationDateTime);
      cutoffTime.setMinutes(cutoffTime.getMinutes() - cutoffMinutes);
    } else {
      // If no start time provided, use current time + X minutes as a fallback
      cutoffTime = new Date(now);
      cutoffTime.setMinutes(cutoffTime.getMinutes() + cutoffMinutes);
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
  // Pool/Classroom: X minutes before actual start time
  if (!startTime) return true; // if unknown, be permissive for UI
  const dt = new Date(`${new Date(reservationDateISO).toISOString().slice(0,10)}T${startTime}`);
  const cutoff = new Date(dt);
  const rules = getCutoffRules();
  cutoff.setMinutes(cutoff.getMinutes() - Number(rules[res_type].cutoffMinutes));
  return now < cutoff;
}

export function isBeforeCancelCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): boolean {
  const now = new Date();
  const settings = getSettings();
  
  // Get start time for the reservation
  let reservationStartTime = startTime;
  if (res_type === 'open_water' && !reservationStartTime) {
    reservationStartTime = timeOfDay === 'PM' ? '13:00' : '08:00';
  }

  if (!reservationStartTime) {
    // If start time is unknown, be permissive in UI and let server validate
    return true;
  }

  const cancelMinutes = (() => {
    switch (res_type) {
      case 'open_water': return settings.cancelationCutOffTimeOW ?? 60;
      case 'pool': return settings.cancelationCutOffTimePOOL ?? 60;
      case 'classroom': return settings.cancelationCutOffTimeCLASSROOM ?? 60;
      default: return 60;
    }
  })();

  const day = new Date(reservationDateISO).toISOString().slice(0, 10);
  const start = new Date(`${day}T${reservationStartTime}`);
  const cancelCutoff = new Date(start);
  cancelCutoff.setMinutes(cancelCutoff.getMinutes() - Number(cancelMinutes));
  
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

/**
 * Check if the reservation date is within the allowed lead time
 */
export function isWithinLeadTime(reservationDateISO: string): boolean {
  const settings = getSettings();
  const leadTimeDays = Number(settings.reservationLeadTimeDays || 30);
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const resDate = new Date(reservationDateISO);
  resDate.setHours(0, 0, 0, 0);
  
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + leadTimeDays);
  
  return resDate <= maxDate;
}
