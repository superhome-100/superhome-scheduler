export const POOL_CELL_MINS = 30;
export const POOL_CELLS_PER_DAY = 24 * 60 / POOL_CELL_MINS; // 48

export function blockToLabel(idx: number): string {
  const mins = idx * POOL_CELL_MINS;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function blockRangeToLabels(start: number, end: number): string[] {
  const out: string[] = [];
  for (let i = start; i < end; i++) out.push(blockToLabel(i));
  return out;
}

export function timeToMinutes(t: string | null): number {
  if (!t) return -1;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Build a reservationCells array (length = totalLanes) where each index holds
// the 30-min HH:mm labels occupied on that lane.
export function buildReservationCells(
  opts: {
    startTime: string | null;
    endTime: string | null;
    laneStart: number | null;
    laneSpan: number | null;
    totalLanes: number;
  },
): string[][] {
  const reservationCells: string[][] = Array.from(
    { length: opts.totalLanes },
    () => [],
  );

  const range = timeRangeToBlockRange(opts.startTime, opts.endTime);
  if (!range) return reservationCells;
  if (opts.laneStart == null || opts.laneSpan == null) return reservationCells;

  const laneStart = clamp(opts.laneStart, 1, opts.totalLanes);
  const laneEnd = clamp(opts.laneStart + opts.laneSpan - 1, 1, opts.totalLanes);
  const labels = blockRangeToLabels(range.start, range.end);

  for (let lane = laneStart; lane <= laneEnd; lane++) {
    reservationCells[lane - 1] = labels;
  }

  return reservationCells;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

export function overlaps(
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

export function blockIndex(mins: number): number {
  return Math.floor(mins / POOL_CELL_MINS);
}

export function blockIndexCeil(mins: number): number {
  return Math.ceil(mins / POOL_CELL_MINS);
}

export function timeRangeToBlockRange(
  startTime: string | null,
  endTime: string | null,
): { start: number; end: number } | null {
  const sMin = timeToMinutes(startTime);
  const eMin = timeToMinutes(endTime);
  if (sMin < 0 || eMin < 0) return null;
  if (eMin <= sMin) return null;

  const sIdx = clamp(blockIndex(sMin), 0, POOL_CELLS_PER_DAY);
  const eIdx = clamp(blockIndexCeil(eMin), 0, POOL_CELLS_PER_DAY);
  if (eIdx <= sIdx) return null;

  return { start: sIdx, end: eIdx };
}

export function addCellsForReservation(
  laneCells: Array<Set<number>>,
  opts: {
    startTime: string | null;
    endTime: string | null;
    laneStart: number;
    laneSpan: number;
    totalLanes: number;
  },
): void {
  const range = timeRangeToBlockRange(opts.startTime, opts.endTime);
  if (!range) return;

  const laneStart = clamp(opts.laneStart, 1, opts.totalLanes);
  const laneEnd = clamp(opts.laneStart + opts.laneSpan - 1, 1, opts.totalLanes);

  for (let lane = laneStart; lane <= laneEnd; lane++) {
    const set = laneCells[lane - 1];
    for (let t = range.start; t < range.end; t++) {
      set.add(t);
    }
  }
}

export function findBlockedLanesForIncoming(
  existingLaneCells: Array<Set<number>>,
  opts: {
    startTime: string | null;
    endTime: string | null;
    laneStart: number;
    laneSpan: number;
    totalLanes: number;
  },
): string[] {
  const range = timeRangeToBlockRange(opts.startTime, opts.endTime);
  if (!range) return [];

  const blocked = new Set<string>();
  const laneStart = clamp(opts.laneStart, 1, opts.totalLanes);
  const laneEnd = clamp(opts.laneStart + opts.laneSpan - 1, 1, opts.totalLanes);

  for (let lane = laneStart; lane <= laneEnd; lane++) {
    const set = existingLaneCells[lane - 1];
    for (let t = range.start; t < range.end; t++) {
      if (set.has(t)) {
        blocked.add(String(lane));
        break;
      }
    }
  }

  return Array.from(blocked);
}
