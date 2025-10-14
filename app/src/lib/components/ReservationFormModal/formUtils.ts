import { now, isToday, isPast } from '../../utils/dateUtils';
<<<<<<< HEAD
import { isBeforeCutoff, getCutoffDescription, formatCutoffTime, getCutoffTime } from '../../utils/cutoffRules';
=======
>>>>>>> develop

export const validateForm = (formData: any) => {
  const errors: Record<string, string> = {};
  
  if (!formData.date) {
    errors.date = 'Date is required';
  } else {
<<<<<<< HEAD
    // Check if date is in the past (using dayjs for proper timezone handling)
    const dateObj = now(formData.date);
    const today = now();
    
    if (dateObj.isBefore(today, 'day')) {
      errors.date = 'Reservation date must be today or in the future';
    } else {
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
      
      if (!isBeforeCutoff(reservationDateTime.toISOString(), resType)) {
        const cutoffDescription = getCutoffDescription(resType);
        
        // Only show cutoff time for Open Water reservations
        if (resType === 'open_water') {
          const cutoffTime = getCutoffTime(resType, reservationDateTime.toISOString());
          errors.date = `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}`;
        } else {
          // For Pool and Classroom, just show the description
          errors.date = cutoffDescription;
        }
      }
=======
    // Check if date is in the past
    if (isPast(formData.date)) {
      errors.date = 'Reservation date must be today or in the future';
>>>>>>> develop
    }
  }
  
  // Time validation only for Pool and Classroom
  if (formData.type !== 'openwater') {
    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }
    
    // Additional validation for time when date is today
    if (formData.date && formData.startTime && formData.endTime && isToday(formData.date)) {
      const currentTime = now();
      const startTime = now(`${formData.date}T${formData.startTime}`);
      const endTime = now(`${formData.date}T${formData.endTime}`);
      
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
    if (formData.openWaterType && formData.openWaterType !== 'course_coaching') {
      if (!formData.depth || isNaN(depthNum) || depthNum <= 0) {
        errors.depth = 'Depth (m) must be a positive number';
      } else {
        // Validate depth thresholds
        if (formData.openWaterType === 'autonomous_buoy' && (depthNum < 15 || depthNum > 89)) {
          errors.depth = 'Depth must be between 15-89m for Autonomous on Buoy';
        } else if (formData.openWaterType === 'autonomous_platform' && (depthNum < 15 || depthNum > 99)) {
          errors.depth = 'Depth must be between 15-99m for Autonomous on Platform';
        } else if (formData.openWaterType === 'autonomous_platform_cbs' && (depthNum < 90 || depthNum > 130)) {
          errors.depth = 'Depth must be between 90-130m for Autonomous on Platform+CBS';
        }
      }
    } else if (formData.openWaterType === 'course_coaching') {
      // Course/Coaching depth validation (0-130m)
      if (formData.depth && (!isNaN(depthNum) && (depthNum < 0 || depthNum > 130))) {
        errors.depth = 'Depth must be between 0-130m for Course/Coaching';
      }
    }
    
    // Student count validation for Course/Coaching
    if (formData.openWaterType === 'course_coaching') {
      const studentCount = parseInt(formData.studentCount as unknown as string, 10);
      if (!formData.studentCount || isNaN(studentCount) || studentCount <= 0 || studentCount > 3) {
        errors.studentCount = 'Number of students must be between 1-3';
      }
    }
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
};

export const getDefaultFormData = () => ({
  date: '',
  type: 'pool',
  timeOfDay: 'AM',
  startTime: '',
  endTime: '',
  notes: '',
  depth: '',
  openWaterType: '',
  studentCount: '',
  // Equipment options for Open Water types
  // Default pulley to true for Course/Coaching (will be set when type is selected)
  pulley: false,
  deepFimTraining: false,
  bottomPlate: false,
  largeBuoy: false
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
