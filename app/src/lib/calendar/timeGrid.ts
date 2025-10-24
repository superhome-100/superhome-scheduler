// Shared time-grid utilities for calendar rendering (classroom, pool, etc.)
// Keep functions small and reusable to respect file-size and reuse rules.

export const toMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const hhmm = (val: string | null | undefined): string => {
  if (!val) return '';
  const str = String(val);
  const timeLike = str.match(/\d{2}:\d{2}/);
  return timeLike ? timeLike[0] : '';
};

export const buildSlotMins = (timeSlots: string[] | undefined): number[] => {
  const arr: number[] = [];
  (timeSlots || []).forEach((t) => {
    const tm = hhmm(t);
    if (!tm) return;
    const m = toMin(tm);
    if (!Number.isNaN(m)) arr.push(m);
  });
  return arr;
};

export const hourSlotsFrom = (timeSlots: string[]): string[] => {
  const set = new Set<string>();
  for (const t of timeSlots || []) {
    const m = toMin(hhmm(t));
    const h = Math.floor(m / 60);
    set.add(`${String(h).padStart(2, '0')}:00`);
  }
  return Array.from(set);
};

export const computeGridMetrics = (hourSlots: string[], hourRowPx: number) => {
  const gridStartMin = hourSlots.length ? Math.floor(toMin(hourSlots[0]) / 60) * 60 : 0;
  const gridEndMin = gridStartMin + hourSlots.length * 60;
  const totalGridHeightPx = hourSlots.length * hourRowPx;
  return { gridStartMin, gridEndMin, totalGridHeightPx };
};

export const rectForRange = (
  startHHmm: string,
  endHHmm: string,
  gridStartMin: number,
  gridEndMin: number,
  hourRowPx: number
): { topPx: number; heightPx: number } | null => {
  if (!startHHmm || !endHHmm) return null;
  const sMin = toMin(startHHmm);
  const eMin = toMin(endHHmm);
  const visStart = Math.max(sMin, gridStartMin);
  const visEnd = Math.min(eMin, gridEndMin);
  if (visEnd <= visStart) return null;
  const topPx = ((visStart - gridStartMin) / 60) * hourRowPx;
  const heightPx = Math.max(2, ((visEnd - visStart) / 60) * hourRowPx - 1);
  return { topPx, heightPx };
};
