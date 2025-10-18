import { OPEN_WATER_SUBTYPES, type OpenWaterSubtypeKey } from '$lib/types/availability';
export const reservationTypes = [
  { value: 'pool', label: 'Pool' },
  { value: 'openwater', label: 'Open Water' },
  { value: 'classroom', label: 'Classroom' }
];

export const timeOfDayOptions = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' }
];

// Derive Open Water options from single source of truth, adding depth ranges for UI display
function withDepthRange(key: OpenWaterSubtypeKey, baseLabel: string): string {
  if (key === 'autonomous_buoy') return `${baseLabel} (0-89m)`;
  if (key === 'autonomous_platform') return `${baseLabel} (0-99m)`;
  if (key === 'autonomous_platform_cbs') return `${baseLabel} (90-130m)`;
  return baseLabel; // course_coaching
}

export const openWaterTypes = (Object.entries(OPEN_WATER_SUBTYPES) as [OpenWaterSubtypeKey, string][]).map(([key, label]) => ({
  value: key,
  label: withDepthRange(key, label)
}));

export const poolTypes = [
  { value: 'autonomous', label: 'Autonomous' },
  { value: 'course_coaching', label: 'Course/Coaching' }
];

export const classroomTypes = [
  { value: 'course_coaching', label: 'Course/Coaching' }
];