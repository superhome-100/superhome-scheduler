import { now, isToday, isPast, createDayjs } from '../../utils/dateUtils';
import { isBeforeCutoff, getCutoffDescription, formatCutoffTime, getCutoffTime, isWithinLeadTime } from '../../utils/cutoffRules';
import { getSettings } from '../../stores/settingsStore';

// Strong typing for Open Water types (reusable across this module)
export enum OpenWaterType {
  CourseCoaching = 'course_coaching',
  AutonomousBuoy = 'autonomous_buoy',
  AutonomousPlatform = 'autonomous_platform',
  AutonomousPlatformCbs = 'autonomous_platform_cbs',
}

export const validateForm = (formData: any) => {
  const errors: Record<string, string> = {};
  
  if (!formData.date) {
    errors.date = 'Date is required';
  } else {
    // Check if date is in the past (using dayjs for proper timezone handling)
    const dateObj = createDayjs(formData.date);
    const today = now();
    
    if (dateObj.isBefore(today, 'day')) {
      errors.date = 'Reservation date must be today or in the future';
    } else {
      // After 7:30pm, Pool/Classroom cannot reserve for Today
      const cutoff = today.hour(19).minute(30).second(0).millisecond(0);
      const afterCutoff = today.isSameOrAfter(cutoff);
      const isPoolOrClassroom = formData.type === 'pool' || formData.type === 'classroom';
      if (isPoolOrClassroom && isToday(formData.date) && afterCutoff) {
        errors.date = 'After 7:30pm, Pool and Classroom reservations must be for tomorrow or later';
      }

      // Check lead time validation
      const settings = getSettings();
      if (!isWithinLeadTime(formData.date)) {
        const leadTimeDays = settings.reservationLeadTimeDays || 30;
        errors.date = `Reservations can only be made up to ${leadTimeDays} days in advance`;
      }

      // Check cut-off time validation
      const resTypeMap: Record<string, 'pool' | 'open_water' | 'classroom'> = {
        'pool': 'pool',
        'openwater': 'open_water',
        'classroom': 'classroom'
      };
      
      const resType = resTypeMap[formData.type] || 'pool';
      
      // For open water, use timeOfDay to determine the appropriate time
      let reservationDateTime: Date;
      if (formData.type === 'openwater' && formData.timeOfDay) {
        // Use appropriate time based on timeOfDay
        const time = formData.timeOfDay === 'AM' ? '08:00' : '13:00';
        reservationDateTime = new Date(`${formData.date}T${time}`);
      } else {
        // For pool and classroom, use startTime or default
        reservationDateTime = new Date(`${formData.date}T${formData.startTime || '12:00'}`);
      }
      
      // Only apply date-level cutoff validation for Open Water.
      // For Pool/Classroom, time-level validation handles 30-min lead; do not flag date as error.
      if (resType === 'open_water') {
        if (!isBeforeCutoff(reservationDateTime.toISOString(), resType)) {
          const cutoffDescription = getCutoffDescription(resType);
          const cutoffTime = getCutoffTime(resType, reservationDateTime.toISOString());
          errors.date = `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}`;
        }
      }
    }
  }
  
  // Time validation only for Pool and Classroom
  if (formData.type !== 'openwater') {
    // Pool-specific required field
    if (formData.type === 'pool') {
      if (!formData.poolType) {
        errors.poolType = 'Pool Type is required';
      }
      // Student count for Pool Course/Coaching
      if (formData.poolType === 'course_coaching') {
        const studentCount = parseInt(formData.studentCount as unknown as string, 10);
        if (!formData.studentCount || isNaN(studentCount) || studentCount <= 0 || studentCount > 6) {
          errors.studentCount = 'Number of students must be between 1-6';
        }
      }
    }

    // Classroom-specific required field
    if (formData.type === 'classroom') {
      if (!formData.classroomType) {
        errors.classroomType = 'Classroom Type is required';
      }
      // Student count for Classroom Course/Coaching
      if (formData.classroomType === 'course_coaching') {
        const studentCount = parseInt(formData.studentCount as unknown as string, 10);
        if (!formData.studentCount || isNaN(studentCount) || studentCount <= 0 || studentCount > 10) {
          errors.studentCount = 'Number of students must be between 1-10';
        }
      }
    }

    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }
    
    // Additional validation for time when date is today
    if (formData.date && formData.startTime && formData.endTime && isToday(formData.date)) {
      const currentTime = now();
      const startTime = createDayjs(`${formData.date}T${formData.startTime}`);
      const endTime = createDayjs(`${formData.date}T${formData.endTime}`);
      
      if (startTime.isBefore(currentTime)) {
        errors.startTime = 'Start time must be in the future';
      }
      if (endTime.isBefore(currentTime)) {
        errors.endTime = 'End time must be in the future';
      }
      if (startTime.isAfter(endTime)) {
        errors.endTime = 'End time must be after start time';
      }
    }
  }
  
  // Open Water validations
  if (formData.type === 'openwater') {
    if (!formData.timeOfDay) {
      errors.timeOfDay = 'Time of day is required for Open Water';
    }
    if (!formData.openWaterType) {
      errors.openWaterType = 'Open Water type is required';
    }
    
    // Validate Open Water time periods for today
    if (formData.date && formData.timeOfDay && isToday(formData.date)) {
      const currentTime = now();
      const currentHour = currentTime.hour();
      
      // Check if selected time period is still available today
      if (formData.timeOfDay === 'AM' && currentHour >= 12) {
        errors.timeOfDay = 'AM time slot is no longer available for today';
      } else if (formData.timeOfDay === 'PM' && currentHour >= 17) {
        errors.timeOfDay = 'PM time slot is no longer available for today';
      }
    }
    
    // Depth validation based on type
    const depthNum = parseInt(formData.depth as unknown as string, 10);
    if (formData.openWaterType && formData.openWaterType !== OpenWaterType.CourseCoaching) {
      if (!formData.depth || isNaN(depthNum) || depthNum <= 0) {
        errors.depth = 'Depth (m) must be a positive number';
      } else {
        // Validate depth thresholds
        if (formData.openWaterType === OpenWaterType.AutonomousBuoy && (depthNum < 15 || depthNum > 89)) {
          errors.depth = 'Depth must be between 15-89m for Autonomous on Buoy';
        } else if (formData.openWaterType === OpenWaterType.AutonomousPlatform && (depthNum < 15 || depthNum > 99)) {
          errors.depth = 'Depth must be between 15-99m for Autonomous on Platform';
        } else if (formData.openWaterType === OpenWaterType.AutonomousPlatformCbs && (depthNum < 90 || depthNum > 130)) {
          errors.depth = 'Depth must be between 90-130m for Autonomous on Platform+CBS';
        }
      }
    } else if (formData.openWaterType === OpenWaterType.CourseCoaching) {
      // Course/Coaching depth validation: enforce minimum 15m if provided
      if (formData.depth) {
        if (!isNaN(depthNum) && (depthNum < 15 || depthNum > 130)) {
          errors.depth = 'Depth must be between 15-130m for Course/Coaching';
        }
      }
    }
    
    // Student count validation for Course/Coaching
    if (formData.openWaterType === OpenWaterType.CourseCoaching) {
      const studentCount = parseInt(formData.studentCount as unknown as string, 10);
      if (!formData.studentCount || isNaN(studentCount) || studentCount <= 0 || studentCount > 4) {
        errors.studentCount = 'Number of students must be between 1-4';
      }
    }

    // Autonomous Platform group-size rule: require owner + at least 2 buddies (min group of 3)
    if (
      formData.openWaterType === OpenWaterType.AutonomousPlatform ||
      formData.openWaterType === OpenWaterType.AutonomousPlatformCbs
    ) {
      const buddies: unknown = formData.buddies;
      const buddyList = Array.isArray(buddies) ? buddies : [];
      if (buddyList.length < 2) {
        errors.buddies = 'Booking this training type requires a minimum of 2 buddies.';
      }
    }
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

// Compute default date based on reservation type and current time (6pm cutoff)
export const getDefaultDateForType = (type: 'openwater' | 'pool' | 'classroom') => {
  const nowDt = now();
  if (type === 'openwater') {
    // Open Water keeps dynamic cutoff logic for default date
    const settings = getSettings();
    const cutoffTimeStr = settings.reservationCutOffTimeOW || '18:00';
    const [hours, minutes] = cutoffTimeStr.split(':').map(Number);
    const owCutoff = nowDt.hour(hours || 18).minute(minutes || 0).second(0).millisecond(0);
    const owAfterCutoff = nowDt.isSameOrAfter(owCutoff);
    const addDays = owAfterCutoff ? 2 : 1;
    return nowDt.add(addDays, 'day').format('YYYY-MM-DD');
  }
  // Pool/Classroom use 7:30pm cutoff: before -> today, after -> tomorrow
  const pcCutoff = nowDt.hour(19).minute(30).second(0).millisecond(0);
  const pcAfterCutoff = nowDt.isSameOrAfter(pcCutoff);
  const addDays = pcAfterCutoff ? 1 : 0;
  return nowDt.add(addDays, 'day').format('YYYY-MM-DD');
};

export const getDefaultFormData = () => ({
  date: getDefaultDateForType('openwater'),
  type: 'openwater',
  timeOfDay: 'AM',
  startTime: '',
  endTime: '',
  notes: '',
  depth: '',
  openWaterType: OpenWaterType.AutonomousBuoy,
  // Pool specific
  poolType: '',
  // Classroom specific
  classroomType: 'course_coaching',
  studentCount: '',
  // Equipment options for Open Water types
  // Default pulley to true for Course/Coaching (will be set when type is selected)
  pulley: false,
  deepFimTraining: false,
  bottomPlate: false,
  largeBuoy: false,
  buddies: []
});

export const getSubmissionData = (formData: any) => {
  const submissionData = { ...formData };
  if (submissionData.type === 'openwater') {
    if (formData.timeOfDay === 'AM') {
      submissionData.startTime = '08:00';
      submissionData.endTime = '12:00';
    } else {
      submissionData.startTime = '13:00';
      submissionData.endTime = '17:00';
    }
  }
  return submissionData;
};

// Compute default Start/End times for Pool/Classroom respecting 30-minute intervals
// Rules:
// - If selected type is Pool/Classroom and current time is BEFORE 6pm: date defaults to today (handled by getDefaultDateForType)
//   - Start time = next 30-minute slot from now, clamped within 08:00 to 19:30
//   - End time = Start + 30 minutes (max 20:00)
// - If AFTER 6pm: date defaults to tomorrow and Start=08:00, End=08:30
export const getDefaultTimesFor = (type: 'openwater' | 'pool' | 'classroom') => {
  if (type === 'openwater') {
    return { startTime: '', endTime: '' };
  }

  const nowDt = now();
  // Pool/Classroom cutoff at 7:30pm
  const cutoff = nowDt.hour(19).minute(30).second(0).millisecond(0);
  const afterCutoff = nowDt.isSameOrAfter(cutoff);

  // After cutoff -> tomorrow 08:00-08:30
  if (afterCutoff) {
    return { startTime: '08:00', endTime: '08:30' };
  }

  // Before cutoff -> today: compute next slot after adding 30 minutes to current time, rounded up to 30-min grid
  const plus30 = nowDt.add(30, 'minute');
  const hour = plus30.hour();
  const minute = plus30.minute();

  // Round up to the next 30-minute mark from plus30 (00 -> 30, 01-30 -> 30, 31-59 -> +1h:00)
  const roundedMinutes = minute === 0 ? 30 : (minute <= 30 ? 30 : 60);
  let startHour = hour + (roundedMinutes === 60 ? 1 : 0);
  let startMinute = roundedMinutes === 60 ? 0 : roundedMinutes;

  // Clamp to operating window 08:00 - 19:30 for start times
  if (startHour < 8) {
    startHour = 8; startMinute = 0;
  }
  // If rounding pushed beyond 19:30, clamp to 19:30
  if (startHour > 19 || (startHour === 19 && startMinute > 30)) {
    startHour = 19; startMinute = 30;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startTime = `${pad(startHour)}:${pad(startMinute)}`;

  // End time = start + 30 minutes, cap at 20:00
  let endHour = startHour;
  let endMinute = startMinute + 30;
  if (endMinute >= 60) { endHour += 1; endMinute = 0; }
  if (endHour > 20 || (endHour === 20 && endMinute > 0)) { endHour = 20; endMinute = 0; }
  const endTime = `${pad(endHour)}:${pad(endMinute)}`;

  return { startTime, endTime };
};
