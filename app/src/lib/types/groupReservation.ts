import { openWaterLabelFromKey, type OpenWaterSubtypeKey } from './availability';

export type ActivityType =
  | 'course_coaching'
  | 'autonomous_buoy_0_89'
  | 'autonomous_platform_0_99'
  | 'autonomous_platform_cbs_90_130'
  | string
  | null;

export interface MemberRow {
  uid: string;
  name: string | null;
  depth_m: number | null;
  student_count: number | null;
  bottom_plate: boolean;
  pulley: boolean;
  large_buoy: boolean;
  activity_type: ActivityType;
  open_water_type: string | null;
}

export function typeLabel(act: ActivityType, openWaterType: string | null): string {
  if (act === 'course_coaching') return 'Course/Coaching';
  if (act === 'autonomous_buoy_0_89') return 'Autonomous on Buoy (0-89m)';
  if (act === 'autonomous_platform_0_99') return 'Autonomous on Platform (0-99m)';
  if (act === 'autonomous_platform_cbs_90_130') return 'Autonomous on Platform + CBS (90-130m)';
  // Check open_water_type for course_coaching as well
  if (openWaterType === 'course_coaching') return 'Course/Coaching';
  // Normalize plain open_water_type values to human-readable labels via single source of truth
  const key = openWaterType as OpenWaterSubtypeKey | null;
  if (key && (key === 'autonomous_buoy' || key === 'autonomous_platform' || key === 'autonomous_platform_cbs')) {
    return openWaterLabelFromKey(key);
  }
  // Fallback to open_water_type display if provided
  return openWaterType || 'Open Water';
}

export function showEquipment(act: ActivityType): boolean {
  // Equipment shown for Course/Coaching and Autonomous Buoy (0-89m)
  return act === 'course_coaching' || act === 'autonomous_buoy_0_89';
}
