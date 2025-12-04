import type { CompleteReservation } from '$lib/services/reservationService';

// Minimal profile shape carried with reservations for display names
export type MinimalUserProfile = {
  id?: string;
  nickname?: string | null;
  name?: string | null;
};

export type BaseReservationView = {
  reservation_id: CompleteReservation['reservation_id'];
  uid: CompleteReservation['uid'];
  res_date: CompleteReservation['res_date'];
  res_type: CompleteReservation['res_type'];
  res_status: CompleteReservation['res_status'];
  title?: string | null;
  description?: string | null;
  user_profiles?: MinimalUserProfile | null; // owner profile for display
};

export type PoolReservationView = BaseReservationView & {
  res_type: 'pool';
  start_time: string | null;
  end_time: string | null;
  lane: string | null;
  pool_type: string | null;
  student_count: number | null;
  note: string | null;
};

export type OpenWaterReservationView = BaseReservationView & {
  res_type: 'open_water';
  group_id: number | null;
  time_period: string | null;
  depth_m: number | null;
  buoy: string | null;
  pulley: boolean | null;
  deep_fim_training: boolean | null;
  bottom_plate: boolean | null;
  large_buoy: boolean | null;
  open_water_type: string | null;
  student_count: number | null;
  note: string | null;
};

export type ClassroomReservationView = BaseReservationView & {
  res_type: 'classroom';
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  classroom_type: string | null;
  student_count: number | null;
  note: string | null;
};

export type FlattenedReservation =
  | PoolReservationView
  | OpenWaterReservationView
  | ClassroomReservationView
  | BaseReservationView;
