import dayjs from 'dayjs';
import { supabase } from '../utils/supabase';
import type { Database } from '../database.types';

export type SettingsUpdate = Database['public']['Tables']['settings_updates']['Row'];

export const settingsService = {
  async getLatestSettings(settingsName: string = 'default'): Promise<SettingsUpdate | null> {
    const { data, error } = await supabase
      .from('settings_updates')
      .select('*')
      .eq('settings_name', settingsName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return null;
    }

    return data;
  },

  async getSettingsForDate(date: string, settingsName: string = 'default'): Promise<SettingsUpdate | null> {
    // Determine the cutoff timestamp properly.
    // If date is "2025-12-27", we want settings created on or before the end of that day.
    const cutoff = dayjs(date).endOf('day').toISOString();

    const { data, error } = await supabase
      .from('settings_updates')
      .select('*')
      .eq('settings_name', settingsName)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings for date:', error);
      return null;
    }

    return data;
  }
};
