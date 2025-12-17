// Shared helpers for pool lane assignment used by reservations-create and reservations-update
// Note: keep this file small and focused so it can be safely imported from multiple edge functions.

 import {
   addCellsForReservation,
   findBlockedLanesForIncoming,
 } from "./poolCells.ts";

export type PoolLaneContext = {
  supabase: any;
  totalLanes?: number; // default 8
};

// Compute how many contiguous lanes a reservation should occupy
// - course_coaching: occupies (1 + student_count)
// - autonomous or others: occupies 1 lane
export function poolSpanWidth(
  pool_type: string | null | undefined,
  student_count: number | null | undefined,
  totalLanes: number,
): number {
  const raw = pool_type ? String(pool_type).trim().toLowerCase() : '';
  const simplified = raw.replace(/\s+/g, '_').replace(/\//g, '_');
  const isCourseCoaching = simplified === 'course_coaching' || (simplified.includes('course') && simplified.includes('coach'));

  if (!isCourseCoaching) return 1;

  const sc = typeof student_count === 'number' && Number.isFinite(student_count) ? student_count : 0;
  const width = Math.max(1, 1 + Math.max(0, sc));
  return Math.max(1, Math.min(width, totalLanes));
}

export interface FindPoolLaneOpts {
  resDateIso: string; // parent res_date ISO
  startTime: string | null;
  endTime: string | null;
  excludeReservationId?: number | string | null; // when updating: parent reservation_id
  poolType?: string | null;
  studentCount?: number | null | string;
  totalLanes?: number;
}

// Core search: find first contiguous block of lanes that can host this reservation
export async function findAvailablePoolLane(
  ctx: PoolLaneContext,
  opts: FindPoolLaneOpts,
): Promise<string | null> {
  const { supabase } = ctx;
  const totalLanes = opts.totalLanes ?? 8;
  const dateOnly = String(opts.resDateIso).split("T")[0];
  const from = `${dateOnly} 00:00:00+00`;
  const to = `${dateOnly} 23:59:59+00`;

  const excludeReservationId = opts.excludeReservationId ?? null;

  // Normalize student count
  let sc: number | null = null;
  if (typeof opts.studentCount === "string") {
    const parsed = parseInt(opts.studentCount, 10);
    sc = Number.isFinite(parsed) ? parsed : null;
  } else if (typeof opts.studentCount === "number") {
    sc = Number.isFinite(opts.studentCount) ? opts.studentCount : null;
  }

  const requiredSpan = poolSpanWidth(opts.poolType ?? null, sc, totalLanes);

  // Fetch pool reservations for the day via parent to respect status
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "reservation_id, res_status, res_pool(lane, start_time, end_time, pool_type, student_count)",
    )
    .eq("res_type", "pool")
    .in("res_status", ["pending", "confirmed"])
    .gte("res_date", from)
    .lt("res_date", to);

  if (error) {
    console.error("[poolLane] Error fetching pool reservations for occupancy:", error);
    return null;
  }

  // Track occupied lanes per time window, respecting span of each existing reservation
  const laneCells: Array<Set<number>> = Array.from(
    { length: totalLanes },
    () => new Set<number>(),
  );

  for (const row of data || []) {
    if (!row) continue;
    if (excludeReservationId != null) {
      const rowId = (row as any).reservation_id as number | string | null;
      if (rowId != null && String(rowId) === String(excludeReservationId)) continue;
    }
    const rp = (row as any).res_pool;
    if (!rp) continue;
    const lane = rp.lane as string | null;
    const s = rp.start_time as string | null;
    const e = rp.end_time as string | null;
    if (!lane) continue;

    const rowScRaw = rp.student_count as number | string | null;
    let rowSc: number | null = null;
    if (typeof rowScRaw === "string") {
      const parsed = parseInt(rowScRaw, 10);
      rowSc = Number.isFinite(parsed) ? parsed : null;
    } else if (typeof rowScRaw === "number") {
      rowSc = Number.isFinite(rowScRaw) ? rowScRaw : null;
    }

    const rowSpan = poolSpanWidth(
      rp.pool_type as string | null,
      rowSc,
      totalLanes,
    );

    const startLaneNum = parseInt(String(lane), 10);
    if (!Number.isFinite(startLaneNum)) continue;

    addCellsForReservation(laneCells, {
      startTime: s,
      endTime: e,
      laneStart: startLaneNum,
      laneSpan: rowSpan,
      totalLanes,
    });
  }

  // Find first contiguous block of requiredSpan free lanes
  const span = Math.max(1, Math.min(requiredSpan, totalLanes));
  for (let startLane = 1; startLane + span - 1 <= totalLanes; startLane++) {
    const blockedLanes = findBlockedLanesForIncoming(laneCells, {
      startTime: opts.startTime,
      endTime: opts.endTime,
      laneStart: startLane,
      laneSpan: span,
      totalLanes,
    });
    if (blockedLanes.length === 0) return String(startLane);
  }

  return null;
}
