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
  admin_notes?: string | null;
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


export function reservationCompleteToFlattened(reservation: CompleteReservation): FlattenedReservation {
  const common: BaseReservationView = {
    reservation_id: reservation.reservation_id,
    uid: reservation.uid,
    res_date: reservation.res_date,
    res_type: reservation.res_type,
    res_status: reservation.res_status,
    title: null,
    admin_notes: reservation?.admin_notes ?? null,
    user_profiles: {
      nickname: reservation?.user_profiles?.nickname ?? null,
      name: reservation?.user_profiles?.name ?? null,
    },
  };
  if (reservation.res_type === "pool" && reservation.res_pool) {
    const view: PoolReservationView = {
      ...common,
      res_type: "pool",
      start_time: reservation.res_pool.start_time,
      end_time: reservation.res_pool.end_time,
      lane: reservation.res_pool.lane ?? null,
      pool_type: reservation.res_pool.pool_type ?? null,
      student_count: reservation.res_pool.student_count ?? null,
      note: reservation.res_pool.note ?? null,
    };
    return view;
  }
  else if (
    reservation.res_type === "open_water" &&
    reservation.res_openwater
  ) {
    const view: OpenWaterReservationView = {
      ...common,
      res_type: "open_water",
      group_id: reservation.res_openwater.group_id ?? null,
      time_period: reservation.res_openwater.time_period,
      depth_m: reservation.res_openwater.depth_m ?? null,
      buoy: reservation.res_openwater.buoy ?? null,
      pulley: reservation.res_openwater.pulley ?? null,
      deep_fim_training:
        reservation.res_openwater.deep_fim_training ?? null,
      bottom_plate: reservation.res_openwater.bottom_plate ?? null,
      large_buoy: reservation.res_openwater.large_buoy ?? null,
      open_water_type:
        reservation.res_openwater.open_water_type ?? null,
      student_count: reservation.res_openwater.student_count ?? null,
      note: reservation.res_openwater.note ?? null,
    };
    return view;
  }
  else if (
    reservation.res_type === "classroom" &&
    reservation.res_classroom
  ) {
    const view: ClassroomReservationView = {
      ...common,
      res_type: "classroom",
      start_time: reservation.res_classroom.start_time,
      end_time: reservation.res_classroom.end_time,
      room: reservation.res_classroom.room ?? null,
      classroom_type: reservation.res_classroom.classroom_type ?? null,
      student_count: reservation.res_classroom.student_count ?? null,
      note: reservation.res_classroom.note ?? null,
    };
    return view;
  } else {
    console.warn(`unhandled res_type ${reservation}`)
    // Fallback: return base fields only if detail tables are missing
    return common;
  }
}