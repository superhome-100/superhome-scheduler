// Shared helpers for pool lane assignment used by reservations-create and reservations-update
// Note: keep this file small and focused so it can be safely imported from multiple edge functions.

export type PoolLaneContext = {
  supabase: any;
  totalLanes?: number; // default 8
};

function timeToMinutes(t: string | null): number {
  if (!t) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null,
): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  if (aS < 0 || aE < 0 || bS < 0 || bE < 0) return false;
  return aS < bE && aE > bS;
}

// Compute how many contiguous lanes a reservation should occupy
// - course_coaching: occupies (1 + student_count)
// - autonomous or others: occupies 1 lane
export function poolSpanWidth(
  pool_type: string | null | undefined,
  student_count: number | null | undefined,
  totalLanes: number,
): number {
  if (pool_type === "course_coaching") {
    const sc = typeof student_count === "number" && Number.isFinite(student_count)
      ? student_count
      : 0;
    const width = 1 + Math.max(0, sc);
    return Math.max(1, Math.min(width, totalLanes));
  }
  return 1;
}

export interface FindPoolLaneOpts {
  resDateIso: string; // parent res_date ISO
  startTime: string | null;
  endTime: string | null;
  excludeUid: string; // reservation owner uid
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
      "uid, res_status, res_pool(lane, start_time, end_time, pool_type, student_count)",
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
  const occupied: Set<string> = new Set();

  for (const row of data || []) {
    if (!row || (row as any).uid === opts.excludeUid) continue;
    const rp = (row as any).res_pool;
    if (!rp) continue;
    const lane = rp.lane as string | null;
    const s = rp.start_time as string | null;
    const e = rp.end_time as string | null;
    if (!lane) continue;
    if (!overlaps(s, e, opts.startTime, opts.endTime)) continue;

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

    for (
      let l = startLaneNum;
      l < startLaneNum + rowSpan && l <= totalLanes;
      l++
    ) {
      occupied.add(String(l));
    }
  }

  // Find first contiguous block of requiredSpan free lanes
  const span = Math.max(1, Math.min(requiredSpan, totalLanes));
  for (let startLane = 1; startLane + span - 1 <= totalLanes; startLane++) {
    let free = true;
    for (let l = startLane; l < startLane + span; l++) {
      if (occupied.has(String(l))) {
        free = false;
        break;
      }
    }
    if (free) return String(startLane);
  }

  return null;
}
