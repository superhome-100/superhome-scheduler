// Utilities for Classroom Calendar, reusing shared time grid helpers
// Keep classroom-specific extractors here. Generic time functions are imported from shared.
import { toMin, hhmm, buildSlotMins } from '$lib/calendar/timeGrid';

// Minimal, reusable structure used by classroom calendar utilities
// Covers both current shape (nested res_classroom) and legacy flat fields
export interface ClassroomResLike {
  uid?: string;
  id?: string | number; // legacy or UI-generated ids
  res_id?: string | number; // legacy
  start_time?: string | null; // legacy flat
  end_time?: string | null; // legacy flat
  startTime?: string | null; // older camelCase variants
  endTime?: string | null;
  room?: string | number | null; // may be numeric or string in some datasets
  res_classroom?: {
    start_time?: string | null;
    end_time?: string | null;
    room?: string | number | null;
  } | null;
  __display_room_idx?: number; // assigned for layout only
}

export const getStartHHmm = (res: ClassroomResLike): string => {
  return (
    hhmm(res?.start_time) || hhmm(res?.res_classroom?.start_time) || hhmm(res?.startTime)
  );
};

export const getEndHHmm = (res: ClassroomResLike): string => {
  return hhmm(res?.end_time) || hhmm(res?.res_classroom?.end_time) || hhmm(res?.endTime);
};

export const getRoom = (res: ClassroomResLike): string => {
  return (
    (res?.room != null ? String(res.room) : '') ||
    (res?.res_classroom?.room != null ? String(res.res_classroom.room) : '')
  );
};

export { buildSlotMins, toMin, hhmm };

// Note: slot increment helpers are no longer needed by the classroom component

const indexAtOrAfter = (slotMins: number[], mins: number): number => {
  if (!slotMins.length) return -1;
  for (let i = 0; i < slotMins.length; i++) if (slotMins[i] >= mins) return i;
  return -1;
};

export const computeStartEndIdx = (
  res: ClassroomResLike,
  slotMins: number[]
): { startIdx: number; endIdx: number } => {
  const s = getStartHHmm(res);
  const e = getEndHHmm(res);
  if (!s || !e) return { startIdx: -1, endIdx: -1 };
  const sIdx = indexAtOrAfter(slotMins, toMin(s));
  let eIdx = indexAtOrAfter(slotMins, toMin(e));
  if (eIdx === -1 && slotMins.length) eIdx = slotMins.length; // exclusive
  return { startIdx: sIdx, endIdx: eIdx };
};

// Assign rooms for display if not specified, avoiding overlaps per slot indices
export const assignProvisionalRooms = (
  reservations: ClassroomResLike[],
  rooms: string[],
  slotMins: number[]
): ClassroomResLike[] => {
  if (!Array.isArray(reservations) || !slotMins.length) return reservations;
  const cloned = reservations.map((r) => ({ ...r }));
  cloned.sort(
    (a, b) => toMin(getStartHHmm(a) || '00:00') - toMin(getStartHHmm(b) || '00:00')
  );

  const occupancy = rooms.map(() => new Set<number>());

  const occupyRange = (roomIdx: number, startIdx: number, endIdx: number) => {
    for (let i = startIdx; i < endIdx; i++) occupancy[roomIdx].add(i);
  };
  const isFree = (roomIdx: number, startIdx: number, endIdx: number) => {
    for (let i = startIdx; i < endIdx; i++) if (occupancy[roomIdx].has(i)) return false;
    return true;
  };

  // Pre-occupy explicit room reservations
  for (const r of cloned) {
    const explicit = String(getRoom(r) || '');
    const ridx = explicit ? rooms.indexOf(explicit) : -1;
    const { startIdx, endIdx } = computeStartEndIdx(r, slotMins);
    if (ridx >= 0 && startIdx >= 0 && endIdx > startIdx) occupyRange(ridx, startIdx, endIdx);
  }

  // Assign the rest
  for (const r of cloned) {
    const explicit = String(getRoom(r) || '');
    const ridx = explicit ? rooms.indexOf(explicit) : -1;
    const { startIdx, endIdx } = computeStartEndIdx(r, slotMins);
    if (startIdx < 0 || endIdx <= startIdx) continue;
    if (ridx >= 0) {
      r.__display_room_idx = ridx;
      continue;
    }
    for (let i = 0; i < rooms.length; i++) {
      if (isFree(i, startIdx, endIdx)) {
        r.__display_room_idx = i;
        occupyRange(i, startIdx, endIdx);
        break;
      }
    }
  }

  return cloned;
};

export const resKey = (r: ClassroomResLike, rooms: string[]): string => {
  const room = getRoom(r);
  const ridx = (r.__display_room_idx ?? (room ? rooms.indexOf(room) : 'X')) as string | number;
  const candidate = (r?.id ?? r?.uid ?? r?.res_id);
  if (candidate !== undefined && candidate !== null && candidate !== '') {
    return String(candidate);
  }
  return `${ridx}-${getStartHHmm(r)}-${getEndHHmm(r)}`;
};
