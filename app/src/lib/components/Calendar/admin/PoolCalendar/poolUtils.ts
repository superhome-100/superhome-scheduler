// Pool-specific extractors and helpers built on shared calendar/timeGrid
import { hhmm, toMin, buildSlotMins } from '$lib/calendar/timeGrid';

// Minimal, reusable structure for Pool reservations (flat or nested under res_pool)
// Mirrors the typed approach used in Classroom calendar utils.
export interface PoolResLike {
  uid?: string;
  id?: string | number;
  res_id?: string | number;
  start_time?: string | null;
  end_time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  lane?: string | number | null;
  student_count?: number | string | null;
  pool_type?: string | null;
  poolType?: string | null; // tolerate camelCase variants
  res_pool?: {
    start_time?: string | null;
    end_time?: string | null;
    lane?: string | number | null;
    student_count?: number | string | null;
    pool_type?: string | null;
    poolType?: string | null;
  } | Array<{
    start_time?: string | null;
    end_time?: string | null;
    lane?: string | number | null;
    student_count?: number | string | null;
    pool_type?: string | null;
    poolType?: string | null;
  }> | null;
  // Optional user info used for display in the calendar
  user_id?: string | number | null;
  user?: { id?: string | number | null } | null;
  user_profiles?: {
    id?: string | number | null;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    nickname?: string | null;
  } | null;
  // Flat properties for admin view or other contexts
  username?: string | null;
  email?: string | null;
  nickname?: string | null;
  name?: string | null;
  title?: string | null;
  // Assigned by layout logic only (not persisted)
  __display_lane_idx?: number;
  __display_span?: number;
}

const getResPool = (res: PoolResLike): NonNullable<PoolResLike['res_pool']> extends any[] ? any : any => {
  const rp: any = (res as any)?.res_pool ?? null;
  if (Array.isArray(rp)) return rp[0] ?? null;
  return rp;
};

export const getStartHHmm = (res: PoolResLike): string => (
  hhmm(res?.start_time) || hhmm(getResPool(res)?.start_time) || hhmm(res?.startTime)
);

export const getEndHHmm = (res: PoolResLike): string => (
  hhmm(res?.end_time) || hhmm(getResPool(res)?.end_time) || hhmm(res?.endTime)
);

export const getLane = (res: PoolResLike): string => (
  (res?.lane != null ? String(res.lane) : '') ||
  (getResPool(res)?.lane != null ? String(getResPool(res).lane) : '')
);

export { hhmm, toMin, buildSlotMins };

export const resKey = (r: PoolResLike, lanes: string[]): string => {
  const lane = getLane(r);
  const lidx = (r.__display_lane_idx ?? (lane ? lanes.indexOf(lane) : 'X')) as string | number;
  const candidate = (r?.id ?? r?.uid ?? r?.res_id);
  if (candidate !== undefined && candidate !== null && candidate !== '') {
    return String(candidate);
  }
  return `${lidx}-${getStartHHmm(r)}-${getEndHHmm(r)}`;
};

// Extractors for counts
export const getStudentCount = (res: PoolResLike): number => {
  const raw = res?.student_count ?? getResPool(res)?.student_count ?? 0;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : raw;
  return Number.isFinite(n) && n > 0 ? n as number : 0;
};

export const getPeopleCount = (res: PoolResLike): number => {
  // Count owner/instructor (1) + students
  const students = getStudentCount(res);
  return 1 + students;
};

// Pool type extractor tolerant to various shapes
export const getPoolType = (res: PoolResLike): string | null => (
  (res?.pool_type
    ?? res?.poolType
    ?? getResPool(res)?.pool_type
    ?? getResPool(res)?.poolType
    ?? null) as string | null
);

const normalizePoolType = (raw: string | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // Accept either canonical values or UI/display strings.
  if (s === 'course_coaching') return 'course_coaching';
  const simplified = s.replace(/\s+/g, '_').replace(/\//g, '_');
  if (simplified.includes('course') && simplified.includes('coach')) return 'course_coaching';
  return simplified;
};

// Compute how many contiguous lanes a reservation should occupy for display/assignment
// - course_coaching: occupies (1 + student_count)
// - autonomous or others: occupies 1 lane
const getSpanWidth = (res: PoolResLike, totalLanes: number): number => {
  const type = normalizePoolType(getPoolType(res));
  if (type === 'course_coaching') {
    const width = getPeopleCount(res);
    return Math.max(1, Math.min(width, totalLanes));
  }
  return 1;
};

export function assignProvisionalLanes(
  reservations: PoolResLike[],
  lanes: string[],
  slotMins: number[]
): PoolResLike[] {
  if (!Array.isArray(reservations) || !slotMins.length) return reservations;
  const cloned = reservations.map((r) => ({ ...r }));
  cloned.sort((a, b) => toMin(getStartHHmm(a) || '00:00') - toMin(getStartHHmm(b) || '00:00'));

  // Occupancy tracker per lane: set of slot indices occupied
  const occ: Array<Set<number>> = lanes.map(() => new Set<number>());
  const occupyRange = (laneIdx: number, startIdx: number, endIdx: number) => {
    for (let i = startIdx; i < endIdx; i++) occ[laneIdx].add(i);
  };
  const lanesRangeFree = (startLane: number, span: number, startIdx: number, endIdx: number): boolean => {
    for (let l = startLane; l < startLane + span; l++) {
      if (l < 0 || l >= lanes.length) return false;
      for (let i = startIdx; i < endIdx; i++) {
        if (occ[l].has(i)) return false;
      }
    }
    return true;
  };
  const occupyLaneSpan = (startLane: number, span: number, startIdx: number, endIdx: number) => {
    for (let l = startLane; l < startLane + span; l++) occupyRange(l, startIdx, endIdx);
  };
  const indexAtOrAfter = (mins: number): number => {
    if (!slotMins.length) return -1;
    for (let i = 0; i < slotMins.length; i++) if (slotMins[i] >= mins) return i;
    return -1;
  };

  const indexAfter = (mins: number): number => {
    if (!slotMins.length) return -1;
    for (let i = 0; i < slotMins.length; i++) if (slotMins[i] > mins) return i;
    return -1;
  };

  const safeRange = (startMins: number, endMins: number): { sIdx: number; eIdx: number } | null => {
    const sIdx = indexAtOrAfter(startMins);
    // Treat ranges as [start, end) so back-to-back bookings don't collide.
    // Using indexAtOrAfter(end) prevents a booking ending exactly on a slot boundary
    // from occupying the next slot.
    let eIdx = indexAtOrAfter(endMins);
    if (sIdx < 0) return null;
    if (eIdx === -1) eIdx = slotMins.length;
    // Ensure non-empty range even when times are equal/coarse-grained
    if (eIdx <= sIdx) eIdx = Math.min(sIdx + 1, slotMins.length);
    if (eIdx <= sIdx) return null;
    return { sIdx, eIdx };
  };

  // Helper to clamp width to available lanes
  const clampSpan = (width: number) => Math.max(1, Math.min(width, lanes.length));

  // Pre-occupy explicit starting lanes (treat explicit lane as starting lane)
  for (const r of cloned) {
    const explicit = String(getLane(r) || '');
    const startLane = explicit ? lanes.indexOf(explicit) : -1;
    const range = safeRange(toMin(getStartHHmm(r)), toMin(getEndHHmm(r)));
    if (!range) continue;
    const { sIdx, eIdx } = range;
    if (startLane >= 0) {
      const span = clampSpan(getSpanWidth(r, lanes.length));
      // Only pre-occupy if the contiguous span fits and is free; otherwise leave for assignment phase
      if (startLane + span <= lanes.length && lanesRangeFree(startLane, span, sIdx, eIdx)) {
        r.__display_lane_idx = startLane;
        r.__display_span = span;
        occupyLaneSpan(startLane, span, sIdx, eIdx);
      }
    }
  }

  // Assign remaining reservations to first available contiguous span
  for (const r of cloned) {
    if (typeof r.__display_lane_idx === 'number') continue; // already placed
    const range = safeRange(toMin(getStartHHmm(r)), toMin(getEndHHmm(r)));
    if (!range) continue;
    const { sIdx, eIdx } = range;

    const span = clampSpan(getSpanWidth(r, lanes.length));
    // search start lane where a contiguous span fits
    for (let startLane = 0; startLane + span <= lanes.length; startLane++) {
      if (lanesRangeFree(startLane, span, sIdx, eIdx)) {
        r.__display_lane_idx = startLane;
        r.__display_span = span;
        occupyLaneSpan(startLane, span, sIdx, eIdx);
        break;
      }
    }
  }

  return cloned;
}
