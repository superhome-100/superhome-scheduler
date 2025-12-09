import dayjs from './dateUtils';

// Attempt to extract a numeric price from a reservation-like object
export const pickNumericPrice = (r: any): number => {
  if (!r) return 0;
  const candidates = [r.price, r.total_price, r.totalPrice, r.amount, r.fee, r.cost];
  const val = candidates.find((v) => v !== undefined && v !== null && v !== '');
  const n = Number(val);
  return !isNaN(n) && isFinite(n) ? n : 0;
};

// Get a usable date string from reservation (YYYY-MM-DD)
export const getResDate = (r: any): string => {
  const date = r?.res_date || r?.date;
  if (!date) return '';
  const d = dayjs(date);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};

// Determine if reservation date/time is in the past (end-of-day threshold)
const isPastReservation = (r: any): boolean => {
  const d = getResDate(r);
  if (!d) return false;
  const endOfDay = dayjs(d).endOf('day');
  return endOfDay.isBefore(dayjs());
};

const getStatusLower = (r: any): string => {
  return String(r?.res_status || r?.status || '').toLowerCase();
};

// Compute effective status for aggregation/display inside completed lists
// Rule: pending + past => cancelled; else keep as-is
const getEffectiveStatus = (r: any): string => {
  const status = getStatusLower(r);
  if (status === 'pending' && isPastReservation(r)) return 'cancelled';
  return status;
};

// Return an adjusted copy that reflects effective status for UI without mutating the input
const withEffectiveStatus = (r: any): any => {
  const effective = getEffectiveStatus(r);
  const original = getStatusLower(r);
  if (effective && effective !== original) {
    return { ...r, res_status: effective, status: effective };
  }
  return r;
};

export interface MonthlyGroup {
  ym: string;          // e.g., '2025-11'
  label: string;       // e.g., 'November 2025'
  items: any[];
  monthTotal: number;
}

// Group reservations by month and compute totals
export const groupCompletedByMonth = (reservations: any[]): MonthlyGroup[] => {
  const map = new Map<string, MonthlyGroup>();

  for (const r of reservations || []) {
    // Use an adjusted copy to reflect auto-cancel rule for past pending
    const adjusted = withEffectiveStatus(r);
    const d = getResDate(adjusted);
    if (!d) continue;
    const dj = dayjs(d);
    const ym = dj.format('YYYY-MM');
    const label = dj.format('MMMM YYYY');

    if (!map.has(ym)) {
      map.set(ym, { ym, label, items: [], monthTotal: 0 });
    }
    const g = map.get(ym)!;
    g.items.push(adjusted);
    // Exclude cancelled from monthly totals
    const eff = getEffectiveStatus(adjusted);
    if (eff !== 'cancelled') {
      g.monthTotal += pickNumericPrice(adjusted);
    }
  }

  // Sort groups by year-month descending (latest first)
  const groups = Array.from(map.values()).sort((a, b) => b.ym.localeCompare(a.ym));
  // Optional: sort items by date ascending within a group
  for (const g of groups) {
    g.items.sort((a, b) => {
      const da = getResDate(a);
      const db = getResDate(b);
      return da.localeCompare(db) || String(a?.start_time || a?.startTime || '').localeCompare(String(b?.start_time || b?.startTime || ''));
    });
  }

  return groups;
};

export const computeOverallTotal = (reservations: any[]): number => {
  return (reservations || []).reduce((sum, r) => {
    const adjusted = withEffectiveStatus(r);
    const eff = getEffectiveStatus(adjusted);
    if (eff === 'cancelled') return sum;
    return sum + pickNumericPrice(adjusted);
  }, 0);
};

export const formatPeso = (amount: number): string => {
  return `P${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
