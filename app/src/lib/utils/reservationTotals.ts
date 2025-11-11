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
    const d = getResDate(r);
    if (!d) continue;
    const dj = dayjs(d);
    const ym = dj.format('YYYY-MM');
    const label = dj.format('MMMM YYYY');

    if (!map.has(ym)) {
      map.set(ym, { ym, label, items: [], monthTotal: 0 });
    }
    const g = map.get(ym)!;
    g.items.push(r);
    g.monthTotal += pickNumericPrice(r);
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
  return (reservations || []).reduce((sum, r) => sum + pickNumericPrice(r), 0);
};

export const formatPeso = (amount: number): string => {
  return `P${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
