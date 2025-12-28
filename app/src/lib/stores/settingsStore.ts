import { writable, get } from 'svelte/store';
import { settingsService } from '$lib/services/settingsService';

// Default fallback values based on system rules
export const DEFAULT_SETTINGS: any = {
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
  poolLable: 'Lane',
  classroomLable: 'Room',
};

export const settingsStore = writable<any>(DEFAULT_SETTINGS);

export const loadSettings = async () => {
  try {
    const settings = await settingsService.getLatestSettings();
    if (settings) {
      settingsStore.set(settings);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
};

export const getSettings = () => get(settingsStore);
