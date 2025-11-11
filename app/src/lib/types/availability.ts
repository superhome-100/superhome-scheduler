// Availability types and mappings (strict typing, reusable)
// Keep aligned with UI/ReservationType: uses 'pool' | 'openwater' | 'classroom'
// If DB uses a different literal (e.g., 'open_water'), map at API boundaries.

import { ReservationType } from './reservations';
import type { ReservationTypeLiteral } from './reservations';
import type { Enums } from '../database.types';

// Re-export ReservationType as AvailabilityCategory (value + type) to ensure single source of truth
export const AvailabilityCategory = ReservationType;
export type AvailabilityCategory = ReservationType;

export type AvailabilityCategoryLiteral = ReservationTypeLiteral;

// Literal unions matching DB-allowed values (single source of truth)
// Frontend enum for Pool activity type (keys match DB planned enum 'pool_activity_type')
export enum PoolActivityType {
  course_coaching = 'course_coaching',
  autonomous = 'autonomous',
}

// UI labels for Pool
export const POOL_TYPES = ['Autonomous', 'Course/Coaching'] as const;
export type PoolType = typeof POOL_TYPES[number];

export function poolLabelFromKey(key: PoolActivityType): PoolType {
  return key === PoolActivityType.autonomous ? 'Autonomous' : 'Course/Coaching';
}

export function poolKeyFromLabel(label: PoolType): PoolActivityType {
  return label === 'Autonomous' ? PoolActivityType.autonomous : PoolActivityType.course_coaching;
}

// (Removed OPEN_WATER_TYPES in favor of OPEN_WATER_SUBTYPES below to keep a single source of truth)

// Frontend enum for Classroom activity type (keys match DB planned enum 'classroom_activity_type')
export enum ClassroomActivityType {
  course_coaching = 'course_coaching',
}

// UI labels for Classroom
export const CLASSROOM_TYPES = ['Course/Coaching'] as const;
export type ClassroomType = typeof CLASSROOM_TYPES[number];

export function classroomLabelFromKey(key: ClassroomActivityType): ClassroomType {
  return 'Course/Coaching';
}

export function classroomKeyFromLabel(_label: ClassroomType): ClassroomActivityType {
  return ClassroomActivityType.course_coaching;
}

// Single source of truth for Open Water subtype keys -> base labels (no depth ranges)
export const OPEN_WATER_SUBTYPES = {
  course_coaching: 'Course/Coaching',
  autonomous_buoy: 'Autonomous on Buoy',
  autonomous_platform: 'Autonomous on Platform',
  autonomous_platform_cbs: 'Autonomous on Platform + CBS',
} as const;
export type OpenWaterSubtypeKey = keyof typeof OPEN_WATER_SUBTYPES;

// DB-aligned enum for Open Water activity type
export type OpenWaterActivityType = Enums<'openwater_activity_type'>; // course_coaching | autonomous_buoy | autonomous_platform | autonomous_platform_cbs

// Labels array derived from the map (keeps literals centralized without duplicating strings)
export const OPEN_WATER_LABELS = [
  OPEN_WATER_SUBTYPES.course_coaching,
  OPEN_WATER_SUBTYPES.autonomous_buoy,
  OPEN_WATER_SUBTYPES.autonomous_platform,
  OPEN_WATER_SUBTYPES.autonomous_platform_cbs,
] as const;
export type OpenWaterLabel = typeof OPEN_WATER_LABELS[number];

export function openWaterLabelFromKey(key: OpenWaterSubtypeKey): OpenWaterLabel {
  return OPEN_WATER_SUBTYPES[key];
}

export function openWaterLabelFromActivity(key: OpenWaterActivityType): OpenWaterLabel {
  return OPEN_WATER_SUBTYPES[key as OpenWaterSubtypeKey];
}

export function openWaterKeyFromLabel(label: OpenWaterLabel): OpenWaterActivityType {
  switch (label) {
    case OPEN_WATER_SUBTYPES.autonomous_buoy:
      return 'autonomous_buoy';
    case OPEN_WATER_SUBTYPES.autonomous_platform:
      return 'autonomous_platform';
    case OPEN_WATER_SUBTYPES.autonomous_platform_cbs:
      return 'autonomous_platform_cbs';
    case OPEN_WATER_SUBTYPES.course_coaching:
    default:
      return 'course_coaching';
  }
}

// Mapping of category to its allowed type union
export type CategoryTypeUnion<C extends AvailabilityCategory = AvailabilityCategory> =
  C extends ReservationType.pool
    ? PoolType
    : C extends ReservationType.openwater
      ? OpenWaterLabel
      : ClassroomType;

// Options list per category with strict typing
export const CategoryTypeOptions: {
  [ReservationType.pool]: Readonly<PoolType[]>;
  [ReservationType.openwater]: Readonly<OpenWaterLabel[]>;
  [ReservationType.classroom]: Readonly<ClassroomType[]>;
} = {
  [ReservationType.pool]: POOL_TYPES,
  [ReservationType.openwater]: OPEN_WATER_LABELS,
  [ReservationType.classroom]: CLASSROOM_TYPES,
};

export function toAvailabilityCategory(rt: ReservationType): AvailabilityCategory {
  switch (rt) {
    case ReservationType.pool:
      return ReservationType.pool;
    case ReservationType.classroom:
      return ReservationType.classroom;
    case ReservationType.openwater:
    default:
      return ReservationType.openwater;
  }
}

export function fromAvailabilityCategory(cat: AvailabilityCategory): ReservationType {
  switch (cat) {
    case ReservationType.pool:
      return ReservationType.pool;
    case ReservationType.classroom:
      return ReservationType.classroom;
    case ReservationType.openwater:
    default:
      return ReservationType.openwater;
  }
}
