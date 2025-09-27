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
    const depthNum = parseInt(formData.depth as unknown as string, 10);
    if (!formData.depth || isNaN(depthNum) || depthNum <= 0) {
      errors.depth = 'Depth (m) must be a positive number';
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
  autoPair: false
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
