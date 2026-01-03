import dayjs from './dateUtils';
import type { ReservationType } from '../services/reservationService';
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
  const resDate = dayjs(reservationDate);
  
  if (res_type === 'open_water') {
    // 6 PM local time on the day before the reservation
    const [hours, minutes] = (rules.open_water.cutoffTime as string).split(':').map(Number);
    return resDate.subtract(1, 'day')
      .hour(hours || 18)
      .minute(minutes || 0)
      .second(0)
      .millisecond(0)
      .toDate();
  } else {
    // X minutes before reservation time
    const minutes = Number(rules[res_type].cutoffMinutes);
    return resDate.subtract(minutes, 'minute').toDate();
  }
}

/**
 * Check if current time is before the cutoff time
 */
export function isBeforeCutoff(
  reservationDate: string,
  res_type: ReservationType
): boolean {
  const resDate = dayjs(reservationDate);
  const now = dayjs();
  
  // For open water, check if it's same day (not allowed)
  if (res_type === 'open_water') {
    if (resDate.isSame(now, 'day')) {
      return false;
    }
  }
  
  const cutoffTime = dayjs(getCutoffTime(res_type, reservationDate));
  return now.isBefore(cutoffTime);
}

/**
 * Format cutoff time for display
 */
export function formatCutoffTime(cutoffTime: Date): string {
  return dayjs(cutoffTime).format('ddd, MMM D, YYYY, h:mm A');
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
  const now = dayjs();
  let cutoffTime: dayjs.Dayjs;
  
  const rules = getCutoffRules();
  if (res_type === 'open_water') {
    cutoffTime = dayjs(getCutoffTime(res_type, reservationDate));
  } else {
    const cutoffMinutes = Number(rules[res_type].cutoffMinutes);
    if (startTime && !['AM', 'PM'].includes(startTime)) {
      const day = dayjs(reservationDate).format('YYYY-MM-DD');
      cutoffTime = dayjs(`${day}T${startTime}`).subtract(cutoffMinutes, 'minute');
    } else {
      cutoffTime = now.add(cutoffMinutes, 'minute');
    }
  }
  
  const diffMinutes = cutoffTime.diff(now, 'minute');
  
  if (diffMinutes <= 0) {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }
  
  return { 
    hours: Math.floor(diffMinutes / 60), 
    minutes: diffMinutes % 60, 
    totalMinutes: diffMinutes 
  };
}

export function isBeforeModificationCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): boolean {
  const now = dayjs();
  if (res_type === 'open_water') {
    let targetDate = dayjs(reservationDateISO);
    if (timeOfDay || (startTime && ['AM', 'PM'].includes(startTime))) {
      const period = timeOfDay || (startTime as 'AM' | 'PM');
      const timeStr = period === 'PM' ? '13:00' : '08:00';
      const day = targetDate.format('YYYY-MM-DD');
      targetDate = dayjs(`${day}T${timeStr}`);
    }
    return now.isBefore(dayjs(getCutoffTime('open_water', targetDate.toISOString())));
  }

  if (!startTime || ['AM', 'PM'].includes(startTime)) return true;
  
  const day = dayjs(reservationDateISO).format('YYYY-MM-DD');
  const start = dayjs(`${day}T${startTime}`);
  const rules = getCutoffRules();
  const cutoff = start.subtract(Number(rules[res_type].cutoffMinutes), 'minute');
  
  return now.isBefore(cutoff);
}

export function isBeforeCancelCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string,
  timeOfDay?: 'AM' | 'PM'
): boolean {
  const now = dayjs();
  const settings = getSettings();
  
  // Normalize reservation start time
  let resStartTime = startTime;
  let resTimeOfDay = timeOfDay;

  // Handle case where startTime might be 'AM' or 'PM' (UnifiedReservation for Open Water)
  if (startTime === 'AM' || startTime === 'PM') {
    resTimeOfDay = startTime as 'AM' | 'PM';
    resStartTime = undefined;
  }

  if (res_type === 'open_water' && !resStartTime) {
    resStartTime = resTimeOfDay === 'PM' ? '13:00' : '08:00';
  }

  if (!resStartTime) {
    return true; // Be permissive if unknown
  }

  const cancelMinutes = (() => {
    switch (res_type) {
      case 'open_water': return settings.cancelationCutOffTimeOW ?? 60;
      case 'pool': return settings.cancelationCutOffTimePOOL ?? 60;
      case 'classroom': return settings.cancelationCutOffTimeCLASSROOM ?? 60;
      default: return 60;
    }
  })();

  const day = dayjs(reservationDateISO).format('YYYY-MM-DD');
  const start = dayjs(`${day}T${resStartTime}`);
  const cancelCutoff = start.subtract(Number(cancelMinutes), 'minute');
  
  return now.isBefore(cancelCutoff);
}

export type EditPhase = 'flexible' | 'restricted' | 'locked';

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
  
  const now = dayjs().startOf('day');
  const resDate = dayjs(reservationDateISO).startOf('day');
  const maxDate = now.add(leadTimeDays, 'day');
  
  return resDate.isSameOrBefore(maxDate);
}
