// Day.js utility functions for consistent date/time handling
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(relativeTime);


/**
 * Format date and time together
 */
export const formatDateTime = (dateString: string, timeString?: string): string => {
  if (!dateString) return '';
  
  const date = dayjs(dateString);
  if (!date.isValid()) {
    console.error('Invalid date string:', dateString);
    return dateString;
  }
  
  if (timeString) {
    const time = dayjs(`2000-01-01T${timeString}`).format('h:mm A');
    return `${date.format('dddd, MMMM D, YYYY')} at ${time}`;
  }
  
  return date.format('dddd, MMMM D, YYYY [at] h:mm A');
};

/**
 * Get time of day (AM/PM) from date
 */
export const getTimeOfDay = (date: string | Date): 'AM' | 'PM' => {
  const dayjsDate = dayjs(date);
  return dayjsDate.hour() < 12 ? 'AM' : 'PM';
};

/**
 * Format date for ISO string (YYYY-MM-DD)
 */
export const formatDateForISO = (dateString: string): string => {
  if (!dateString) return '';
  const date = dayjs(dateString);
  return date.isValid() ? date.format('YYYY-MM-DD') : dateString;
};

/**
 * Format time for 24-hour format (HH:MM) with support for 24:00
 */
export const formatTimeFor24Hour = (timeString: string): string => {
  if (!timeString) return '';
  
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString; // Already in HH:MM format
  } else if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    return timeString.padStart(5, '0'); // Pad single digit hours
  } else {
    const time = dayjs(`2000-01-01T${timeString}`);
    return time.isValid() ? time.format('HH:mm') : timeString;
  }
};

/**
 * Check if time string is in 24:00 format (24:00 to 24:59)
 */
export const is24HourFormat = (timeString: string): boolean => {
  if (!timeString) return false;
  return timeString.startsWith('24:');
};

/**
 * Convert 24:00 format to valid dayjs time (23:59:59.999)
 */
export const normalize24HourTime = (timeString: string): string => {
  if (!timeString) return '';
  
  if (timeString === '24:00') return '23:59:59.999';
  if (timeString.startsWith('24:')) {
    const minutes = timeString.split(':')[1];
    return `23:59:${minutes}.999`;
  }
  
  return timeString;
};

/**
 * Validate time format including 24:00 format
 */
export const isValidTimeFormat = (timeString: string): boolean => {
  if (!timeString) return true;
  
  // Allow 24:00 format (24:00 to 24:59)
  if (timeString === '24:00') return true;
  if (timeString.startsWith('24:')) {
    const minutes = parseInt(timeString.split(':')[1]);
    return minutes >= 0 && minutes <= 59;
  }
  
  // Standard 24-hour format (00:00 to 23:59)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

/**
 * Check if date is today
 */
export const isToday = (dateString: string): boolean => {
  const date = dayjs(dateString);
  return date.isValid() && date.isSame(dayjs(), 'day');
};

/**
 * Check if date is in the past
 */
export const isPast = (dateString: string): boolean => {
  const date = dayjs(dateString);
  return date.isValid() && date.isBefore(dayjs(), 'day');
};

/**
 * Check if date is in the future
 */
export const isFuture = (dateString: string): boolean => {
  const date = dayjs(dateString);
  return date.isValid() && date.isAfter(dayjs(), 'day');
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 hours")
 */
export const getRelativeTime = (dateString: string): string => {
  const date = dayjs(dateString);
  return date.isValid() ? date.fromNow() : dateString;
};

/**
 * Format date for calendar display
 */
export const formatDateForCalendar = (dateString: string): string => {
  const date = dayjs(dateString);
  return date.isValid() ? date.format('MMM D') : dateString;
};

/**
 * Format time for calendar display
 */
export const formatTimeForCalendar = (timeString: string): string => {
  if (!timeString) return '';
  
  const time = dayjs(`2000-01-01T${timeString}`);
  if (time.isValid()) {
    const hour = time.hour();
    const suffix = hour >= 12 ? 'pm' : 'am';
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}${suffix}`;
  }
  
  return timeString;
};

/**
 * Create a dayjs object from date string
 */
export const createDayjs = (dateString: string) => {
  return dayjs(dateString);
};

/**
 * Get current date/time as dayjs object
 */
export const now = () => {
  return dayjs();
};

export default dayjs;
