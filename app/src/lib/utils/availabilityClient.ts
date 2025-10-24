import { supabase } from './supabase';
import { MSG_NO_POOL_LANES, MSG_NO_CLASSROOMS } from '$lib/constants/messages';
import dayjs from 'dayjs';
import { openWaterLabelFromKey, type OpenWaterSubtypeKey } from '$lib/types/availability';

export type ReservationCategory = 'pool' | 'open_water' | 'classroom';

export interface BlockResult {
  isBlocked: boolean;
  reason: string | null;
}

// Map formData.type to DB category
export function mapCategory(formType: 'pool' | 'openwater' | 'classroom'): ReservationCategory {
  return formType === 'openwater' ? 'open_water' : formType;
}

// Map formData subtype fields to DB "type" text used in availabilities
export function mapSubtype(formType: 'pool' | 'openwater' | 'classroom', formData: any): string | null {
  if (formType === 'pool') {
    const t = formData?.poolType;
    if (t === 'autonomous') return 'Autonomous';
    if (t === 'course_coaching') return 'Course/Coaching';
    return null;
  }
  if (formType === 'classroom') {
    const t = formData?.classroomType;
    if (t === 'course_coaching') return 'Course/Coaching';
    return null;
  }
  // openwater
  const t = formData?.openWaterType as OpenWaterSubtypeKey | undefined;
  return t ? openWaterLabelFromKey(t) : null;
}

// Client-side check for block (READ-only). Returns true if a generic or specific block exists.
export async function checkBlock(dateISOorYYYYMMDD: string, category: ReservationCategory, subtype?: string | null): Promise<BlockResult> {
  try {
    const dateOnly = dayjs(dateISOorYYYYMMDD).format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('availabilities')
      .select('available, reason, type')
      .eq('date', dateOnly)
      .eq('category', category);
    if (error) return { isBlocked: false, reason: null };

    if (!data || data.length === 0) return { isBlocked: false, reason: null };

    const specific = subtype ? data.find((r: any) => r.type === subtype && r.available === false) : null;
    if (specific) return { isBlocked: true, reason: specific.reason || null };

    const generic = data.find((r: any) => (r.type === null || r.type === '') && r.available === false);
    if (generic) return { isBlocked: true, reason: generic.reason || null };

    return { isBlocked: false, reason: null };
  } catch {
    return { isBlocked: false, reason: null };
  }
}

// Convenience wrapper using formData
export async function checkBlockForForm(formData: any): Promise<BlockResult> {
  if (!formData?.date || !formData?.type) return { isBlocked: false, reason: null };
  const category = mapCategory(formData.type);
  const subtype = mapSubtype(formData.type, formData);
  return checkBlock(formData.date, category, subtype);
}

// ---- Capacity checks (READ-only) for Pool lanes and Classroom rooms ----
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  return aS < bE && aE > bS;
}

export interface CapacityResult {
  available: boolean;
  reason?: string;
}

// Pool: lanes 1..8, capacity = 8
export async function checkPoolCapacity(dateISO: string, start_time: string, end_time: string): Promise<CapacityResult> {
  try {
    const dateOnly = dayjs(dateISO).format('YYYY-MM-DD');
    const { data, error } = await supabase
      .from('res_pool')
      .select('lane, start_time, end_time')
      .eq('res_date', dateOnly);
    if (error) return { available: true };

    // Count lanes occupied that overlap
    const occupiedByLane = new Set<string>();
    for (const row of data || []) {
      if (!row?.lane) continue;
      if (row.start_time && row.end_time && overlaps(row.start_time, row.end_time, start_time, end_time)) {
        occupiedByLane.add(String(row.lane));
      }
    }
    const capacity = 8;
    const available = occupiedByLane.size < capacity;
    return available ? { available } : { available, reason: MSG_NO_POOL_LANES };
  } catch {
    return { available: true };
  }
}

// Classroom: rooms 1..3, capacity = 3
export async function checkClassroomCapacity(dateISO: string, start_time: string, end_time: string): Promise<CapacityResult> {
  try {
    const dateOnly = dayjs(dateISO).format('YYYY-MM-DD');
    const from = `${dateOnly} 00:00:00+00`;
    const to = `${dateOnly} 23:59:59+00`;
    // Query from parent reservations to include status and joined classroom times
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        res_status,
        res_classroom(start_time, end_time, room)
      `)
      .eq('res_type', 'classroom')
      .gte('res_date', from)
      .lte('res_date', to)
      .in('res_status', ['pending', 'confirmed']);
    if (error) return { available: true };

    // Count overlapping reservations regardless of assigned room
    let overlappingCount = 0;
    const toMin = (raw: string) => {
      const m = raw.match(/^(\d{2}):(\d{2})/);
      if (!m) return NaN;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };
    const sUser = toMin(start_time);
    const eUser = toMin(end_time);
    for (const row of data || []) {
      const s = row?.res_classroom?.start_time;
      const e = row?.res_classroom?.end_time;
      if (!s || !e) continue;
      const sDb = toMin(s);
      const eDb = toMin(e);
      if (Number.isNaN(sDb) || Number.isNaN(eDb) || Number.isNaN(sUser) || Number.isNaN(eUser)) continue;
      if (sDb < eUser && eDb > sUser) overlappingCount += 1;
    }
    // TODO: replace with settings-driven capacity when available
    const capacity = 3;
    const available = overlappingCount < capacity;
    return available ? { available } : { available, reason: MSG_NO_CLASSROOMS };
  } catch {
    return { available: true };
  }
}

// Convenience wrapper for the form
export async function checkCapacityForForm(formData: any): Promise<CapacityResult & { kind: 'pool' | 'classroom' | null } > {
  if (!formData?.date || !formData?.type) return { available: true, kind: null };
  const dateISO = formData.date;
  const start = formData.startTime;
  const end = formData.endTime;
  if (!start || !end) return { available: true, kind: null };

  if (formData.type === 'pool') {
    const r = await checkPoolCapacity(dateISO, start, end);
    return { ...r, kind: 'pool' };
  }
  if (formData.type === 'classroom') {
    const r = await checkClassroomCapacity(dateISO, start, end);
    return { ...r, kind: 'classroom' };
  }
  return { available: true, kind: null };
}
