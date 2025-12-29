import { supabase } from '../utils/supabase';
import type { SettingsUpdate } from '../types/settings';

export type CreateUpdateSettingsPayload = Omit<SettingsUpdate, 'id' | 'created_at'> & {
  id?: string;
};

class SettingsApi {
  async listUpdates(): Promise<{ success: boolean; data: SettingsUpdate[]; error?: string }> {
    const { data, error } = await supabase
      .from('settings_updates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return { success: false, data: [], error: error.message };
    }
    
    return { success: true, data: (data ?? []) as SettingsUpdate[] };
  }

  /**
   * Retrieves the effective settings for a given date (or current time if not provided).
   * Uses the postgres function get_effective_settings.
   */
  async getEffective(date?: Date): Promise<{ success: boolean; data?: SettingsUpdate; error?: string }> {
    const dateStr = date ? date.toISOString() : new Date().toISOString();
    
    // Call the Postgres function
    const { data, error } = await supabase
      .rpc('get_effective_settings', { t_date: dateStr });
      
    if (error) {
      return { success: false, error: error.message };
    }

    // The function returns SETOF, so we get an array. It should be 0 or 1 item.
    const result = Array.isArray(data) && data.length > 0 ? (data[0] as SettingsUpdate) : undefined;
    return { success: true, data: result };
  }

  async create(payload: CreateUpdateSettingsPayload): Promise<{ success: boolean; data?: SettingsUpdate; error?: string }> {
    const settings_name = payload.settings_name || 'default';

    // 1. Ensure the parent settings record exists
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert({ name: settings_name }, { onConflict: 'name', ignoreDuplicates: true });
    
    if (settingsError) {
      return { success: false, error: settingsError.message };
    }

    // 2. Insert the settings update
    // We construct the insert payload carefully
    const insertPayload: any = { ...payload };
    if (!insertPayload.settings_name) insertPayload.settings_name = settings_name;
    // Remove undefined id so DB generates it, unless strictly provided
    if (!insertPayload.id) delete insertPayload.id;

    const { data, error } = await supabase
      .from('settings_updates')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as SettingsUpdate };
  }

  async update(payload: CreateUpdateSettingsPayload): Promise<{ success: boolean; data?: SettingsUpdate; error?: string }> {
    if (!payload.id) return { success: false, error: 'Missing id for update' };

    // 1. Ensure the parent settings record exists (if name is provided)
    if (payload.settings_name) {
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ name: payload.settings_name }, { onConflict: 'name', ignoreDuplicates: true });
      if (settingsError) {
        return { success: false, error: settingsError.message };
      }
    }

    // 2. Update the record
    const { data, error } = await supabase
      .from('settings_updates')
      .update(payload)
      .eq('id', payload.id)
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as SettingsUpdate };
  }

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('settings_updates')
      .delete()
      .eq('id', id);
    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
  }
}

export const settingsApi = new SettingsApi();
