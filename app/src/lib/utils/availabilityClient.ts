import { supabase } from './supabase';
import dayjs from 'dayjs';

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
  const t = formData?.openWaterType;
  if (t === 'course_coaching') return 'Course/Coaching';
  if (t === 'autonomous_buoy') return 'Autonomous on Buoy';
  if (t === 'autonomous_platform') return 'Autonomous on Platform';
  if (t === 'autonomous_platform_cbs') return 'Autonomous on Platform + CBS';
  return null;
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
