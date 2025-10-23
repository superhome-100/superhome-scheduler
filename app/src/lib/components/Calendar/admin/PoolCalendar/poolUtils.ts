// Pool-specific extractors and helpers built on shared calendar/timeGrid
import { hhmm, toMin, buildSlotMins } from '$lib/calendar/timeGrid';

export const getStartHHmm = (res: any): string => (
  hhmm(res?.start_time) || hhmm(res?.res_pool?.start_time) || hhmm(res?.startTime)
);

export const getEndHHmm = (res: any): string => (
  hhmm(res?.end_time) || hhmm(res?.res_pool?.end_time) || hhmm(res?.endTime)
);

export const getLane = (res: any): string => (
  (res?.lane != null ? String(res.lane) : '') ||
  (res?.res_pool?.lane != null ? String(res.res_pool.lane) : '')
);

export { hhmm, toMin, buildSlotMins };

export const resKey = (r: any, lanes: string[]): string => {
  const lane = getLane(r);
  const lidx = (r.__display_lane_idx ?? (lane ? lanes.indexOf(lane) : 'X')) as string | number;
  return r?.id || r?.uid || r?.res_id || `${lidx}-${getStartHHmm(r)}-${getEndHHmm(r)}`;
};

export function assignProvisionalLanes(reservations: any[], lanes: string[], slotMins: number[]) {
  if (!Array.isArray(reservations) || !slotMins.length) return reservations;
  const cloned = reservations.map((r) => ({ ...r }));
  cloned.sort((a, b) => toMin(getStartHHmm(a) || '00:00') - toMin(getStartHHmm(b) || '00:00'));

  const occ = lanes.map(() => new Set<number>());
  const occupyRange = (laneIdx: number, startIdx: number, endIdx: number) => {
    for (let i = startIdx; i < endIdx; i++) occ[laneIdx].add(i);
  };
  const isFree = (laneIdx: number, startIdx: number, endIdx: number) => {
    for (let i = startIdx; i < endIdx; i++) if (occ[laneIdx].has(i)) return false;
    return true;
  };

  const indexAtOrAfter = (mins: number): number => {
    if (!slotMins.length) return -1;
    for (let i = 0; i < slotMins.length; i++) if (slotMins[i] >= mins) return i;
    return -1;
  };

  // Pre-occupy explicit lanes
  for (const r of cloned) {
    const explicit = String(getLane(r) || '');
    const lidx = explicit ? lanes.indexOf(explicit) : -1;
    const sIdx = indexAtOrAfter(toMin(getStartHHmm(r)));
    let eIdx = indexAtOrAfter(toMin(getEndHHmm(r)));
    if (eIdx === -1) eIdx = slotMins.length;
    if (lidx >= 0 && sIdx >= 0 && eIdx > sIdx) occupyRange(lidx, sIdx, eIdx);
  }

  // Assign the rest
  for (const r of cloned) {
    const explicit = String(getLane(r) || '');
    const lidx = explicit ? lanes.indexOf(explicit) : -1;
    const sIdx = indexAtOrAfter(toMin(getStartHHmm(r)));
    let eIdx = indexAtOrAfter(toMin(getEndHHmm(r)));
    if (eIdx === -1) eIdx = slotMins.length;
    if (sIdx < 0 || eIdx <= sIdx) continue;
    if (lidx >= 0) {
      r.__display_lane_idx = lidx;
      continue;
    }
    for (let i = 0; i < lanes.length; i++) {
      if (isFree(i, sIdx, eIdx)) {
        r.__display_lane_idx = i;
        occupyRange(i, sIdx, eIdx);
        break;
      }
    }
  }

  return cloned;
}
