import { callFunction } from '../utils/functions';
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

  async create(payload: CreateUpdateSettingsPayload): Promise<{ success: boolean; data?: SettingsUpdate; error?: string }> {
    const body = {
      action: 'create' as const,
      ...payload
    };
    const { data, error } = await callFunction<typeof body, { data: SettingsUpdate }>('settings-crud', body);
    if (error) return { success: false, error };
    return { success: true, data: data?.data };
  }

  // We primarily use create (for versioning), but if we needed update/delete:
  async update(payload: CreateUpdateSettingsPayload): Promise<{ success: boolean; data?: SettingsUpdate; error?: string }> {
    if (!payload.id) return { success: false, error: 'Missing id for update' };
    const body = {
      action: 'update' as const,
      ...payload
    };
    const { data, error } = await callFunction<typeof body, { data: SettingsUpdate }>('settings-crud', body);
    if (error) return { success: false, error };
    return { success: true, data: data?.data };
  }

  async remove(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await callFunction<{ action: 'delete'; id: string }, { success: boolean }>('settings-crud', {
      action: 'delete',
      id
    });
    if (error) return { success: false, error };
    return { success: true };
  }
}

export const settingsApi = new SettingsApi();
