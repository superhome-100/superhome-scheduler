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

