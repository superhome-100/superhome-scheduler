// Availability types and mappings (strict typing, reusable)
// Keep aligned with UI/ReservationType: uses 'pool' | 'openwater' | 'classroom'
// If DB uses a different literal (e.g., 'open_water'), map at API boundaries.

import { ReservationType } from './reservations';
import type { ReservationTypeLiteral } from './reservations';

// Re-export ReservationType as AvailabilityCategory (value + type) to ensure single source of truth
export const AvailabilityCategory = ReservationType;
export type AvailabilityCategory = ReservationType;

export type AvailabilityCategoryLiteral = ReservationTypeLiteral;

// Literal unions matching DB-allowed values (single source of truth)
export const POOL_TYPES = ['Autonomous', 'Course/Coaching'] as const;
export type PoolType = typeof POOL_TYPES[number];

// (Removed OPEN_WATER_TYPES in favor of OPEN_WATER_SUBTYPES below to keep a single source of truth)

export const CLASSROOM_TYPES = ['Course/Coaching'] as const;
export type ClassroomType = typeof CLASSROOM_TYPES[number];

// Single source of truth for Open Water subtype keys -> base labels (no depth ranges)
export const OPEN_WATER_SUBTYPES = {
  course_coaching: 'Course/Coaching',
  autonomous_buoy: 'Autonomous on Buoy',
  autonomous_platform: 'Autonomous on Platform',
  autonomous_platform_cbs: 'Autonomous on Platform + CBS',
} as const;
export type OpenWaterSubtypeKey = keyof typeof OPEN_WATER_SUBTYPES;

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
