import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

export interface SettingsUpdate {
  reservationCutOffTimeOW: string;
  cancelationCutOffTimeOW: number;
  reservationCutOffTimePOOL: number;
  cancelationCutOffTimePOOL: number;
  reservationCutOffTimeCLASSROOM: number;
  cancelationCutOffTimeCLASSROOM: number;
  reservationLeadTimeDays: number;
  maxChargeableOWPerMonth: number;
  availablePoolSlots: string;
  availableClassrooms: string;
  poolLabel: string;
  classroomLabel: string;
  [key: string]: any;
}

export async function fetchLatestSettings(supabase: any, settingsName: string = 'default'): Promise<SettingsUpdate> {
  const { data, error } = await supabase
    .from('settings_updates')
    .select('*')
    .eq('settings_name', settingsName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching settings:', error);
    // Return hardcoded defaults if DB fetch fails
    return {
      reservationCutOffTimeOW: '18:00',
      cancelationCutOffTimeOW: 60,
      reservationCutOffTimePOOL: 30,
      cancelationCutOffTimePOOL: 60,
      reservationCutOffTimeCLASSROOM: 30,
      cancelationCutOffTimeCLASSROOM: 60,
      reservationLeadTimeDays: 30,
      maxChargeableOWPerMonth: 12,
      availablePoolSlots: '1,2,3,4,5,6,7,8',
      availableClassrooms: '1,2,3',
      poolLabel: 'Lane',
      classroomLabel: 'Room',
    } as SettingsUpdate;
  }

  return data as SettingsUpdate;
}
