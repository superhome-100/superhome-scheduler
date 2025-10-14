export const validateForm = (formData: any) => {
  const errors: Record<string, string> = {};
  
  if (!formData.date) errors.date = 'Date is required';
  
  // Time validation only for Pool and Classroom
  if (formData.type !== 'openwater') {
    if (!formData.startTime) errors.startTime = 'Start time is required';
    if (!formData.endTime) errors.endTime = 'End time is required';
  }
  
  // Open Water validations
  if (formData.type === 'openwater') {
    if (!formData.timeOfDay) {
      errors.timeOfDay = 'Time of day is required for Open Water';
    }
    if (!formData.openWaterType) {
      errors.openWaterType = 'Open Water type is required';
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
