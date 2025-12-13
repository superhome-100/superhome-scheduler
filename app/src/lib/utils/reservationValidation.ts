import type { 
  CreateReservationData, 
  UpdateReservationData, 
  PoolReservationDetails, 
  ClassroomReservationDetails, 
  OpenWaterReservationDetails 
} from '../services/reservationService';
import { getCutoffTime, isBeforeCutoff, formatCutoffTime, getCutoffDescription } from './cutoffRules';
import { availabilityService } from '../services/availabilityService';

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate reservation creation data
 */
export function validateCreateReservation(data: CreateReservationData): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!data.res_type) {
    errors.push({ field: 'res_type', message: 'Reservation type is required' });
  }

  if (!data.res_date) {
    errors.push({ field: 'res_date', message: 'Reservation date is required' });
  } else {
    // Date validation
    const reservationDate = new Date(data.res_date);
    const now = new Date();
    
    if (isNaN(reservationDate.getTime())) {
      errors.push({ field: 'res_date', message: 'Invalid date format' });
    } else if (reservationDate <= now) {
      errors.push({ field: 'res_date', message: 'Reservation date must be in the future' });
    }
  }

  // Type-specific validation
  switch (data.res_type) {
    case 'pool':
      if (data.pool) {
        const poolErrors = validatePoolDetails(data.pool);
        errors.push(...poolErrors);
      } else {
        errors.push({ field: 'pool', message: 'Pool details are required for pool reservations' });
      }
      break;

    case 'classroom':
      if (data.classroom) {
        const classroomErrors = validateClassroomDetails(data.classroom);
        errors.push(...classroomErrors);
      } else {
        errors.push({ field: 'classroom', message: 'Classroom details are required for classroom reservations' });
      }
      break;

    case 'open_water':
      if (data.openwater) {
        const openWaterErrors = validateOpenWaterDetails(data.openwater);
        errors.push(...openWaterErrors);
      } else {
        errors.push({ field: 'openwater', message: 'Open water details are required for open water reservations' });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate reservation update data
 */
export function validateUpdateReservation(data: UpdateReservationData): ValidationResult {
  const errors: ValidationError[] = [];

  // Date validation if provided
  if (data.res_date) {
    const reservationDate = new Date(data.res_date);
    const now = new Date();
    
    if (isNaN(reservationDate.getTime())) {
      errors.push({ field: 'res_date', message: 'Invalid date format' });
    } else if (reservationDate <= now) {
      errors.push({ field: 'res_date', message: 'Reservation date must be in the future' });
    }
  }

  // Status validation (includes 'cancelled')
  if (data.res_status && !['pending', 'confirmed', 'rejected', 'cancelled'].includes(data.res_status as any)) {
    errors.push({ field: 'res_status', message: 'Invalid reservation status' });
  }

  // Type-specific validation for partial updates
  if (data.pool) {
    const poolErrors = validatePoolDetails(data.pool as PoolReservationDetails, true);
    errors.push(...poolErrors);
  }

  if (data.classroom) {
    const classroomErrors = validateClassroomDetails(data.classroom as ClassroomReservationDetails, true);
    errors.push(...classroomErrors);
  }

  if (data.openwater) {
    const openWaterErrors = validateOpenWaterDetails(data.openwater as OpenWaterReservationDetails, true);
    errors.push(...openWaterErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate pool reservation details
 */
function validatePoolDetails(details: PoolReservationDetails, isPartial = false): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPartial || details.start_time !== undefined) {
    if (!details.start_time) {
      errors.push({ field: 'start_time', message: 'Start time is required' });
    } else if (!isValidTime(details.start_time)) {
      errors.push({ field: 'start_time', message: 'Invalid start time format (use HH:MM)' });
    }
  }

  if (!isPartial || details.end_time !== undefined) {
    if (!details.end_time) {
      errors.push({ field: 'end_time', message: 'End time is required' });
    } else if (!isValidTime(details.end_time)) {
      errors.push({ field: 'end_time', message: 'Invalid end time format (use HH:MM)' });
    }
  }

  // Validate time range
  if (details.start_time && details.end_time && isValidTime(details.start_time) && isValidTime(details.end_time)) {
    const startTime = timeToMinutes(details.start_time);
    const endTime = timeToMinutes(details.end_time);
    
    if (startTime >= endTime) {
      errors.push({ field: 'end_time', message: 'End time must be after start time' });
    }
  }

  // Note length validation
  if (details.note && details.note.length > 500) {
    errors.push({ field: 'note', message: 'Note must be 500 characters or less' });
  }

  // Require pool_type and validate allowed values
  if (!isPartial || details.pool_type !== undefined) {
    if (!details.pool_type) {
      errors.push({ field: 'pool_type', message: 'Pool type is required' });
    } else if (!['autonomous', 'course_coaching'].includes(details.pool_type)) {
      errors.push({ field: 'pool_type', message: 'Invalid pool type' });
    }
  }

  return errors;
}

/**
 * Validate classroom reservation details
 */
function validateClassroomDetails(details: ClassroomReservationDetails, isPartial = false): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPartial || details.start_time !== undefined) {
    if (!details.start_time) {
      errors.push({ field: 'start_time', message: 'Start time is required' });
    } else if (!isValidTime(details.start_time)) {
      errors.push({ field: 'start_time', message: 'Invalid start time format (use HH:MM)' });
    }
  }

  if (!isPartial || details.end_time !== undefined) {
    if (!details.end_time) {
      errors.push({ field: 'end_time', message: 'End time is required' });
    } else if (!isValidTime(details.end_time)) {
      errors.push({ field: 'end_time', message: 'Invalid end time format (use HH:MM)' });
    }
  }

  // Validate time range
  if (details.start_time && details.end_time && isValidTime(details.start_time) && isValidTime(details.end_time)) {
    const startTime = timeToMinutes(details.start_time);
    const endTime = timeToMinutes(details.end_time);
    
    if (startTime >= endTime) {
      errors.push({ field: 'end_time', message: 'End time must be after start time' });
    }
  }

  // Room validation
  if (details.room && details.room.length > 100) {
    errors.push({ field: 'room', message: 'Room name must be 100 characters or less' });
  }

  // Note length validation
  if (details.note && details.note.length > 500) {
    errors.push({ field: 'note', message: 'Note must be 500 characters or less' });
  }

  return errors;
}

/**
 * Validate open water reservation details
 */
function validateOpenWaterDetails(details: OpenWaterReservationDetails, isPartial = false): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPartial || details.time_period !== undefined) {
    if (!details.time_period) {
      errors.push({ field: 'time_period', message: 'Time period is required' });
    } else if (!['AM', 'PM', 'morning', 'afternoon', 'evening'].includes(details.time_period)) {
      errors.push({ field: 'time_period', message: 'Invalid time period (use AM, PM, morning, afternoon, or evening)' });
    }
  }

  // Depth validation
  if (details.depth_m !== undefined && details.depth_m !== null) {
    if (details.depth_m < 0 || details.depth_m > 200) {
      errors.push({ field: 'depth_m', message: 'Depth must be between 0 and 200 meters' });
    }
  }

  // Student count validation for course coaching
  if (details.open_water_type === 'course_coaching') {
    if (!isPartial || details.student_count !== undefined) {
      if (!details.student_count || details.student_count < 1 || details.student_count > 10) {
        errors.push({ field: 'student_count', message: 'Student count must be between 1 and 10 for course coaching' });
      }
    }
  }

  // Open water type validation
  if (details.open_water_type && !['course_coaching', 'autonomous_buoy', 'autonomous_platform', 'autonomous_platform_cbs'].includes(details.open_water_type)) {
    errors.push({ field: 'open_water_type', message: 'Invalid open water type' });
  }

  // Equipment validation
  if (details.pulley !== undefined && typeof details.pulley !== 'boolean') {
    errors.push({ field: 'pulley', message: 'Pulley must be a boolean value' });
  }

  if (details.deep_fim_training !== undefined && typeof details.deep_fim_training !== 'boolean') {
    errors.push({ field: 'deep_fim_training', message: 'Deep FIM training must be a boolean value' });
  }

  if (details.bottom_plate !== undefined && typeof details.bottom_plate !== 'boolean') {
    errors.push({ field: 'bottom_plate', message: 'Bottom plate must be a boolean value' });
  }

  if (details.large_buoy !== undefined && typeof details.large_buoy !== 'boolean') {
    errors.push({ field: 'large_buoy', message: 'Large buoy must be a boolean value' });
  }

  // Note length validation
  if (details.note && details.note.length > 500) {
    errors.push({ field: 'note', message: 'Note must be 500 characters or less' });
  }

  return errors;
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Convert time string to minutes for comparison
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate date range for bulk operations
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  const errors: ValidationError[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    errors.push({ field: 'start_date', message: 'Invalid start date format' });
  }

  if (isNaN(end.getTime())) {
    errors.push({ field: 'end_date', message: 'Invalid end date format' });
  }

  if (errors.length === 0 && start >= end) {
    errors.push({ field: 'end_date', message: 'End date must be after start date' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize reservation data
 */
export function sanitizeReservationData(data: any): any {
  const sanitized = { ...data };

  // Trim string fields
  if (sanitized.note) {
    sanitized.note = sanitized.note.trim();
  }
  if (sanitized.room) {
    sanitized.room = sanitized.room.trim();
  }
  if (sanitized.lane) {
    sanitized.lane = sanitized.lane.trim();
  }

  // Convert empty strings to null for optional fields
  const optionalFields = ['note', 'room', 'lane', 'buoy'];
  optionalFields.forEach(field => {
    if (sanitized[field] === '') {
      sanitized[field] = null;
    }
  });

  // Normalize buddies: keep array of string UIDs, unique; drop for Course/Coaching subtypes
  if (Array.isArray(sanitized.buddies)) {
    const raw = sanitized.buddies as any[];
    const asStrings = raw
      .map((v) => (typeof v === 'string' ? v : (v && typeof v.uid === 'string' ? v.uid : null)))
      .filter((v): v is string => !!v && v.trim().length > 0);
    const unique = Array.from(new Set(asStrings));

    // If subtype is Course/Coaching, omit buddies
    const isCourseCoaching = (
      (sanitized.res_type === 'open_water' && sanitized.openwater?.open_water_type === 'course_coaching') ||
      (sanitized.res_type === 'pool' && sanitized.pool?.pool_type === 'course_coaching') ||
      (sanitized.res_type === 'classroom' && sanitized.classroom?.classroom_type === 'course_coaching')
    );
    sanitized.buddies = isCourseCoaching ? undefined : unique;
  }

  return sanitized;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `${error.field}: ${error.message}`).join(', ');
}

/**
 * Enhanced validation with cut-off time and availability checking
 */
export async function validateCreateReservationWithCutoff(
  data: CreateReservationData
): Promise<ValidationResult> {
  // First run basic validation
  const baseValidation = validateCreateReservation(data);
  const errors: ValidationError[] = [...baseValidation.errors];

  // If basic validation failed, return early
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Add cut-off and availability validation
  if (data.res_date && data.res_type) {
    const cutoffErrors = await validateCutoffAndAvailability(data);
    errors.push(...cutoffErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Enhanced validation for updates with cut-off time and availability checking
 */
export async function validateUpdateReservationWithCutoff(
  data: UpdateReservationData
): Promise<ValidationResult> {
  // First run basic validation
  const baseValidation = validateUpdateReservation(data);
  const errors: ValidationError[] = [...baseValidation.errors];

  // If basic validation failed, return early
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Add cut-off and availability validation if date provided
  if (data.res_date) {
    // For updates, we need to get the res_type from the existing reservation
    // This is a limitation - we'd need to fetch the existing reservation
    // For now, we'll skip cut-off validation for updates without res_type
    console.warn('Cut-off validation for updates requires res_type to be provided');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate cut-off time and availability
 */
async function validateCutoffAndAvailability(
  data: CreateReservationData
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  if (!data.res_date || !data.res_type) {
    return errors;
  }

  // Check cut-off time
  const cutoffTime = getCutoffTime(data.res_type, data.res_date);
  const now = new Date();

  if (now > cutoffTime) {
    const cutoffDescription = getCutoffDescription(data.res_type);
    errors.push({
      field: 'res_date',
      message: `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}`
    });
  }

  // Check availability
  try {
    const availability = await availabilityService.checkAvailability(
      data.res_date,
      data.res_type,
      undefined // category not available in CreateReservationData
    );

    if (!availability.isAvailable) {
      const reason = availability.reason ? ` (${availability.reason})` : '';
      errors.push({
        field: 'res_date',
        message: `This date is not available for reservations${reason}`
      });
    }
  } catch (error) {
    console.error('Error checking availability:', error);
    errors.push({
      field: 'res_date',
      message: 'Unable to verify availability. Please try again.'
    });
  }

  return errors;
}

/**
 * Validate cut-off time only (for quick checks)
 */
export function validateCutoffTime(
  reservationDate: string,
  res_type: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!reservationDate || !res_type) {
    return { isValid: true, errors: [] };
  }

  const cutoffTime = getCutoffTime(res_type as any, reservationDate);
  const now = new Date();

  if (now > cutoffTime) {
    const cutoffDescription = getCutoffDescription(res_type as any);
    errors.push({
      field: 'res_date',
      message: `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}`
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if reservation is within cut-off time
 */
export function isReservationWithinCutoff(
  reservationDate: string,
  res_type: string
): boolean {
  return isBeforeCutoff(reservationDate, res_type as any);
}
