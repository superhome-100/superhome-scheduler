// Availability types and mappings (strict typing, reusable)
// Keep aligned with DB: reservation_type enum uses 'pool' | 'open_water' | 'classroom'
// UI may use ReservationType (openwater) so provide mapping helpers.

import { ReservationType } from './reservations';

export enum AvailabilityCategory {
  pool = 'pool',
  open_water = 'open_water',
  classroom = 'classroom',
}

export type AvailabilityCategoryLiteral = `${AvailabilityCategory}`;

// Literal unions matching DB-allowed values (see migrations)
export type PoolType = 'Autonomous' | 'Course/Coaching';
export type OpenWaterType =
  | 'Course/Coaching'
  | 'Autonomous on Buoy'
  | 'Autonomous on Platform'
  | 'Autonomous on Platform + CBS';
export type ClassroomType = 'Course/Coaching';

// Mapping of category to its allowed type union
export type CategoryTypeUnion<C extends AvailabilityCategory = AvailabilityCategory> =
  C extends AvailabilityCategory.pool
    ? PoolType
    : C extends AvailabilityCategory.open_water
      ? OpenWaterType
      : ClassroomType;

// Options list per category with strict typing
export const CategoryTypeOptions: {
  [AvailabilityCategory.pool]: Readonly<PoolType[]>;
  [AvailabilityCategory.open_water]: Readonly<OpenWaterType[]>;
  [AvailabilityCategory.classroom]: Readonly<ClassroomType[]>;
} = {
  [AvailabilityCategory.pool]: ['Autonomous', 'Course/Coaching'],
  [AvailabilityCategory.open_water]: [
    'Course/Coaching',
    'Autonomous on Buoy',
    'Autonomous on Platform',
    'Autonomous on Platform + CBS',
  ],
  [AvailabilityCategory.classroom]: ['Course/Coaching'],
};

export function toAvailabilityCategory(rt: ReservationType): AvailabilityCategory {
  switch (rt) {
    case ReservationType.pool:
      return AvailabilityCategory.pool;
    case ReservationType.classroom:
      return AvailabilityCategory.classroom;
    case ReservationType.openwater:
    default:
      return AvailabilityCategory.open_water;
  }
}

export function fromAvailabilityCategory(cat: AvailabilityCategory): ReservationType {
  switch (cat) {
    case AvailabilityCategory.pool:
      return ReservationType.pool;
    case AvailabilityCategory.classroom:
      return ReservationType.classroom;
    case AvailabilityCategory.open_water:
    default:
      return ReservationType.openwater;
  }
}
