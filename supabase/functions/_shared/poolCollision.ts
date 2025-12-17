import {
  addCellsForReservation,
  blockToLabel,
  buildReservationCells,
  findBlockedLanesForIncoming,
} from "./poolCells.ts";
import { poolSpanWidth, type PoolLaneContext } from "./poolLane.ts";

export interface CheckPoolLaneCollisionOpts {
  resDateIso: string;
  startTime: string | null;
  endTime: string | null;
  excludeReservationId?: number | string | null; // when updating: parent reservation_id
  lane: string | number | null;
  poolType?: string | null;
  studentCount?: number | null | string;
  totalLanes?: number;
  debug?: boolean; // when true, always log reservation cell generation
}

export async function checkPoolLaneCollision(
  ctx: PoolLaneContext,
  opts: CheckPoolLaneCollisionOpts,
): Promise<{ collision: boolean; blockedLanes: string[] }> {
  const { supabase } = ctx;
  const totalLanes = opts.totalLanes ?? 8;
  const dateOnly = String(opts.resDateIso).split("T")[0];
  const from = `${dateOnly} 00:00:00+00`;
  const to = `${dateOnly} 23:59:59+00`;

  const debug = opts.debug === true || opts.excludeReservationId != null;

  const excludeReservationId = opts.excludeReservationId ?? null;

  const laneStartParsed = opts.lane != null ? parseInt(String(opts.lane), 10) : NaN;
  const laneStartNum = Number.isFinite(laneStartParsed) ? laneStartParsed : null;
  if (laneStartNum == null && !debug) return { collision: false, blockedLanes: [] };

  let sc: number | null = null;
  if (typeof opts.studentCount === "string") {
    const parsed = parseInt(opts.studentCount, 10);
    sc = Number.isFinite(parsed) ? parsed : null;
  } else if (typeof opts.studentCount === "number") {
    sc = Number.isFinite(opts.studentCount) ? opts.studentCount : null;
  }

  const requiredSpan = poolSpanWidth(opts.poolType ?? null, sc, totalLanes);
  const span = Math.max(1, Math.min(requiredSpan, totalLanes));
  if (laneStartNum != null && laneStartNum + span - 1 > totalLanes) {
    const blocked = Array.from({ length: span }, (_, i) => String(laneStartNum + i));
    return { collision: true, blockedLanes: blocked };
  }

  // Build lane -> occupied 30-min block indices using a cell-set model
  const laneCells: Array<Set<number>> = Array.from(
    { length: totalLanes },
    () => new Set<number>(),
  );

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
    console.error("[poolLane] Error fetching pool reservations for collision:", error);
    return { collision: false, blockedLanes: [] };
  }

  if (debug) {
    console.log("[poolLane][collision][debug] start", {
      dateOnly,
      excludeReservationId,
      requested: {
        startTime: opts.startTime,
        endTime: opts.endTime,
        laneStart: laneStartNum,
        span: laneStartNum == null ? null : span,
        poolType: opts.poolType ?? null,
        studentCount: opts.studentCount ?? null,
      },
      fetched: (data || []).length,
    });
  }

  let included = 0;
  let skippedSelf = 0;
  const existingReservationsCells: Array<Record<string, unknown>> = [];
  for (const row of data || []) {
    if (!row) continue;
    if (excludeReservationId != null) {
      const rowId = (row as any).reservation_id as number | string | null;
      if (rowId != null && String(rowId) === String(excludeReservationId)) {
        skippedSelf++;
        continue;
      }
    }
    const rpRaw = (row as any).res_pool;
    const rp = Array.isArray(rpRaw) ? (rpRaw[0] ?? null) : rpRaw;
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

    if (debug) {
      const rowId = (row as any).reservation_id as number | string | null;
      existingReservationsCells.push({
        reservation_id: rowId,
        laneStart: startLaneNum,
        span: rowSpan,
        reservationCells: buildReservationCells({
          startTime: s,
          endTime: e,
          laneStart: startLaneNum,
          laneSpan: rowSpan,
          totalLanes,
        }),
      });
    }

    addCellsForReservation(laneCells, {
      startTime: s,
      endTime: e,
      laneStart: startLaneNum,
      laneSpan: rowSpan,
      totalLanes,
    });
    included++;
  }

  if (debug) {
    const incomingCells = buildReservationCells({
      startTime: opts.startTime,
      endTime: opts.endTime,
      laneStart: laneStartNum,
      laneSpan: laneStartNum == null ? null : span,
      totalLanes,
    });

    const combinedExistingCells: string[][] = laneCells.map((set) => {
      const labels = Array.from(set)
        .filter((n) => typeof n === "number" && Number.isFinite(n))
        .sort((a, b) => a - b)
        .map((idx) => blockToLabel(idx));
      return labels;
    });

    const overlapCells: string[][] = Array.from(
      { length: totalLanes },
      () => [],
    );
    for (let laneIdx = 0; laneIdx < totalLanes; laneIdx++) {
      const incomingSet = new Set(incomingCells[laneIdx]);
      const overlapsHere = combinedExistingCells[laneIdx].filter((t) => incomingSet.has(t));
      if (overlapsHere.length) overlapCells[laneIdx] = overlapsHere;
    }

    console.log("[poolLane][collision][debug] existing reservation cells", {
      included,
      skippedSelf,
      reservations: existingReservationsCells,
    });

    console.log("[poolLane][collision][debug] incoming reservation cells", {
      laneStart: laneStartNum,
      span: laneStartNum == null ? null : span,
      reservationCells: incomingCells,
    });

    console.log("[poolLane][collision][debug] combined existing reservationCells", {
      reservationCells: combinedExistingCells,
    });

    console.log("[poolLane][collision][debug] overlapCells (incoming ∩ existing)", {
      overlapCells,
    });
  }

  if (laneStartNum == null) return { collision: false, blockedLanes: [] };

  const blockedLanes = findBlockedLanesForIncoming(laneCells, {
    startTime: opts.startTime,
    endTime: opts.endTime,
    laneStart: laneStartNum,
    laneSpan: span,
    totalLanes,
  });

  return { collision: blockedLanes.length > 0, blockedLanes };
}
