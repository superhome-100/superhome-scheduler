import { openWaterLabelFromActivity, type OpenWaterActivityType } from './availability';

// Use DB enum strictly for activity_type when available
export type ActivityType = OpenWaterActivityType | null;

export interface MemberRow {
  uid: string;
  name: string | null;
  depth_m: number | null;
  student_count: number | null;
  bottom_plate: boolean;
  pulley: boolean;
  large_buoy: boolean;
  deep_fim_training: boolean;
  activity_type: ActivityType;
  open_water_type: string | null;
}

export function typeLabel(act: ActivityType, openWaterType: string | null): string {
  // Prefer enum when present
  if (act) return openWaterLabelFromActivity(act);
  // Fallback: normalize string key when activity_type is null
  if (openWaterType === 'course_coaching') return 'Course/Coaching';
  if (openWaterType === 'autonomous_buoy') return 'Autonomous on Buoy';
  if (openWaterType === 'autonomous_platform') return 'Autonomous on Platform';
  if (openWaterType === 'autonomous_platform_cbs') return 'Autonomous on Platform + CBS';
  return openWaterType || 'Open Water';
}

export function showEquipment(act: ActivityType): boolean {
  // Equipment shown for Course/Coaching and Autonomous Buoy (0-89m)
  return act === 'course_coaching' || act === 'autonomous_buoy';
}
