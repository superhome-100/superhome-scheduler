// Unified reservation data transformation utilities
// This ensures consistent data structure across all components
import { formatDateForISO, formatTimeFor24Hour, getTimeOfDay } from './dateUtils';

export interface UnifiedReservation {
  // Core identification
  id: string;
  uid: string;
  res_date: string;
  res_type: 'pool' | 'open_water' | 'classroom';
  res_status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'ongoing';
  
  // Display fields
  type: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  timeOfDay: 'AM' | 'PM';
  time_period?: string;
  
  // Optional fields
  notes?: string;
  title?: string;
  
  // Detail table fields
  lane?: string | null;
  room?: string | null;
  depth_m?: number | null;
  buoy?: string | null;
  // auto_adjust_closest field removed
  pulley?: boolean | null;
  deep_fim_training?: boolean | null;
  bottom_plate?: boolean | null;
  large_buoy?: boolean | null;
  open_water_type?: string | null;
  student_count?: number | null;
  
  // Raw identifiers for additional data fetching
  raw_reservation?: any;
}

/**
 * Get display type from reservation type
 */
export const getTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    pool: 'Pool',
    open_water: 'Open Water',
    classroom: 'Classroom'
  };
  return typeMap[type] || type;
};

/**
 * Get display status from reservation status
 */
export const getStatusDisplay = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'approved',
    rejected: 'rejected',
    completed: 'completed',
    ongoing: 'ongoing'
  };
  return statusMap[status] || status || 'pending';
};

/**
 * Get time of day (AM/PM) from date
 */
// getTimeOfDay is now imported from dateUtils


/**
 * Calculate default duration based on reservation type
 */
export const getDefaultDuration = (resType: string): number => {
  const durationMap: Record<string, number> = {
    pool: 60,        // 1 hour
    open_water: 240, // 4 hours
    classroom: 120   // 2 hours
  };
  return durationMap[resType] || 60;
};

/**
 * Generate start and end times for reservations without specific times
 */
export const generateDefaultTimes = (resDate: string, resType: string): { startTime: string; endTime: string } => {
  const date = new Date(resDate);
  const duration = getDefaultDuration(resType);
  const endTime = new Date(date.getTime() + duration * 60 * 1000);
  
  const startTimeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const endTimeStr = endTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  return {
    startTime: formatTimeFor24Hour(startTimeStr),
    endTime: formatTimeFor24Hour(endTimeStr)
  };
};

/**
 * Unified reservation transformation function
 * This is the single source of truth for transforming reservation data
 */
export const transformReservationToUnified = (reservation: any): UnifiedReservation => {
  console.log('transformReservationToUnified: Processing reservation:', reservation);
  
  if (!reservation) {
    throw new Error('Reservation data is required');
  }
  
  // Extract core fields
  const uid = reservation.uid || reservation.id;
  const res_date = reservation.res_date || reservation.date;
  const res_type = reservation.res_type || reservation.type;
  const res_status = reservation.res_status || reservation.status;
  
  if (!uid || !res_date || !res_type) {
    console.error('Missing required fields:', { uid, res_date, res_type, reservation });
    throw new Error('Missing required reservation fields');
  }
  
  const resDate = new Date(res_date);
  if (isNaN(resDate.getTime())) {
    console.error('Invalid date:', res_date);
    throw new Error('Invalid reservation date');
  }
  
  // Handle time fields
  let startTime = '';
  let endTime = '';
  
  // Check if we have specific start/end times from detail tables
  if (reservation.start_time && reservation.end_time) {
    startTime = formatTimeFor24Hour(reservation.start_time);
    endTime = formatTimeFor24Hour(reservation.end_time);
  } else if (reservation.startTime && reservation.endTime) {
    startTime = formatTimeFor24Hour(reservation.startTime);
    endTime = formatTimeFor24Hour(reservation.endTime);
  } else if (res_type === 'open_water' && reservation.time_period) {
    // For open water, use time_period if available
    startTime = reservation.time_period;
    endTime = ''; // Open water doesn't have end time
  } else {
    // Generate default times
    const defaultTimes = generateDefaultTimes(res_date, res_type);
    startTime = defaultTimes.startTime;
    endTime = defaultTimes.endTime;
  }
  
  // Create unified reservation object
  const unified: UnifiedReservation = {
    // Core identification
    id: `${uid}-${res_date}`,
    uid,
    res_date,
    res_type,
    res_status: res_status || 'pending',
    
    // Display fields
    type: getTypeDisplay(res_type),
    status: getStatusDisplay(res_status),
    date: formatDateForISO(res_date),
    startTime,
    endTime,
    timeOfDay: getTimeOfDay(resDate),
    time_period: reservation.time_period || null,
    
    // Optional fields
    notes: reservation.note || reservation.notes || '',
    title: reservation.title || '',
    
    // Detail table fields
    lane: reservation.lane || null,
    room: reservation.room || null,
    depth_m: reservation.depth_m || null,
    buoy: reservation.buoy || null,
    // auto_adjust_closest field removed
    pulley: reservation.pulley ?? null,
    deep_fim_training: reservation.deep_fim_training ?? null,
    bottom_plate: reservation.bottom_plate ?? null,
    large_buoy: reservation.large_buoy ?? null,
    open_water_type: reservation.open_water_type || null,
    student_count: reservation.student_count || null,
    
    // Raw reservation for additional data fetching
    raw_reservation: reservation
  };
  
  console.log('transformReservationToUnified: Final unified reservation:', unified);
  return unified;
};

/**
 * Transform multiple reservations to unified format
 */
export const transformReservationsToUnified = (reservations: any[]): UnifiedReservation[] => {
  return reservations.map(transformReservationToUnified);
};

/**
 * Validate unified reservation data
 */
export const validateUnifiedReservation = (reservation: UnifiedReservation): boolean => {
  const requiredFields = ['id', 'uid', 'res_date', 'res_type', 'type', 'status', 'date'];
  
  for (const field of requiredFields) {
    if (!reservation[field as keyof UnifiedReservation]) {
      console.error(`Missing required field: ${field}`, reservation);
      return false;
    }
  }
  
  return true;
};
