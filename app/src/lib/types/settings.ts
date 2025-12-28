export interface SettingsUpdate {
  id: string;
  created_at: string;
  settings_name: string;
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
  poolLable: string;
  classroomLable: string;
  [key: string]: any;
}
