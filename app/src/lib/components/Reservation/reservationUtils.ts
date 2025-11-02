export const getTypeDisplay = (type: string) => {
  const typeMap: Record<string, string> = {
    pool: 'Pool',
    open_water: 'Open Water',
    classroom: 'Classroom'
  };
  return typeMap[type] || type;
};

export const getOpenWaterTypeDisplay = (openWaterType: string | null | undefined) => {
  if (!openWaterType) return 'Open Water';
  
  // Format open water types
  const typeMap: Record<string, string> = {
    // New system types
    'course_coaching': 'Course/Coaching',
    'autonomous_buoy': 'Autonomous on Buoy',
    'autonomous_platform': 'Autonomous on Platform',
    'autonomous_platform_cbs': 'Autonomous on Platform +CBS',
    
    // Legacy types
    'confined_water': 'Confined Water',
    'open_water': 'Open Water',
    'deep_water': 'Deep Water',
    'night_dive': 'Night Dive',
    'wreck_dive': 'Wreck Dive',
    'drift_dive': 'Drift Dive',
    'altitude_dive': 'Altitude Dive',
    'ice_dive': 'Ice Dive',
    'cave_dive': 'Cave Dive',
    'technical_dive': 'Technical Dive'
  };
  
  return typeMap[openWaterType.toLowerCase()] || openWaterType;
};

export const getStatusDisplay = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'approved',
    rejected: 'rejected'
  };
  return statusMap[status] || status;
};

export const getTimeOfDay = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return 'AM';
  if (hour < 17) return 'PM';
  return 'PM';
};

export const transformReservationForModal = (reservation: any) => {
  const resDate = new Date(reservation.res_date);
  
  // Calculate duration based on reservation type
  let duration = 60; // Default 1 hour
  if (reservation.res_type === 'open_water') {
    duration = 240; // 4 hours for open water
  } else if (reservation.res_type === 'classroom') {
    duration = 120; // 2 hours for classroom
  }
  
  const endTime = new Date(resDate.getTime() + duration * 60 * 1000);
  
  // Transform database data to modal format
  return {
    id: reservation.id,
    date: resDate.toISOString().split('T')[0], // YYYY-MM-DD format
    startTime: resDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    endTime: endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }),
    type: getTypeDisplay(reservation.res_type),
    // Keep canonical status values from DB for logic; map to display only where rendered
    status: reservation.res_status,
    timeOfDay: getTimeOfDay(resDate),
    notes: reservation.description || '',
    title: reservation.title || '',
    // Include raw identifiers so ReservationDetailsModal can fetch OW details
    uid: reservation.uid,
    res_date: reservation.res_date,
    res_type: reservation.res_type
  };
};
