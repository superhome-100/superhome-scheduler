import type { TimePeriod } from '../services/openWaterService';
import type { OpenWaterReservationView } from './reservationViews';

// Shared admin-only buoy group type for Open Water calendar components
export type AdminBuoyGroup = {
  id: number;
  res_date: string;
  time_period: TimePeriod;
  buoy_name: string | null;
  boat: string | null;
  member_uids?: string[] | null;
  res_openwater?: Array<{ uid: string }>;
  member_names?: (string | null)[] | null;
  boat_count?: number | null;
  open_water_type?: string | null;
  // Nested open water reservations associated with this buoy group
  reservations: OpenWaterReservationView[];
};
