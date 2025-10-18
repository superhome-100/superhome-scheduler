// High-level API client for managing availability blocks via Edge Functions
// Writes: through Supabase Edge Function 'availability-manage'
// Reads: can use function 'get' action for consistency

import dayjs from 'dayjs';
import { callFunction } from '../utils/functions';
import { supabase } from '../utils/supabase';
import { AvailabilityCategory } from '../types/availability';
import type { AvailabilityCategoryLiteral } from '../types/availability';

export type AvailabilityBlock = {
  id: number;
  date: string; // YYYY-MM-DD
  category: AvailabilityCategoryLiteral;
  type: string | null;
  available: boolean;
  reason: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateAvailabilityPayload = {
  date: string; // YYYY-MM-DD
  category: AvailabilityCategoryLiteral;
  type?: string | null;
  available?: boolean; // default false when blocking
  reason?: string | null;
};

export class AvailabilityApi {
  // Map UI literals to DB literals
  private uiToDbCategory(cat: AvailabilityCategoryLiteral): 'pool' | 'open_water' | 'classroom' {
    if (cat === 'openwater') return 'open_water';
    return cat as 'pool' | 'classroom';
  }

  // Map DB literals to UI literals
  private dbToUiCategory(cat: string): AvailabilityCategoryLiteral {
    if (cat === 'open_water') return 'openwater';
    if (cat === 'pool' || cat === 'classroom') return cat;
    // Fallback: keep as-is but typed as any to avoid runtime error; callers should handle unknowns gracefully
    return (cat as unknown) as AvailabilityCategoryLiteral;
  }

  async list(): Promise<{ success: boolean; data: AvailabilityBlock[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .order('date', { ascending: false });
      if (error) return { success: false, data: [], error: error.message };
      const mapped = (data ?? []).map((row: any) => ({
        ...row,
        category: this.dbToUiCategory(row.category),
      })) as AvailabilityBlock[];
      return { success: true, data: mapped };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load availabilities';
      return { success: false, data: [], error: msg };
    }
  }

  async create(payload: CreateAvailabilityPayload): Promise<{ success: boolean; data?: AvailabilityBlock; error?: string }> {
    const normalizedType = payload.type === '' ? null : (payload.type ?? null);
    const body = {
      action: 'create' as const,
      date: dayjs(payload.date).format('YYYY-MM-DD'),
      category: this.uiToDbCategory(payload.category),
      type: normalizedType,
      available: payload.available ?? false,
      reason: payload.reason ?? null,
    };
    const { data, error } = await callFunction<typeof body, { data: AvailabilityBlock }>('availability-manage', body);
    if (error) return { success: false, error };
    return { success: true, data: data?.data };
  }

  async remove(id: number): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<{ action: 'delete'; id: number }, { success: boolean }>('availability-manage', {
      action: 'delete',
      id,
    });
    if (error) return { success: false, error };
    return { success: true };
  }
}

export const availabilityApi = new AvailabilityApi();
