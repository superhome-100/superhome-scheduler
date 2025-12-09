import { supabase } from '../utils/supabase';

export type NormalizeByUidPayload = {
  mode: 'by_uid';
  uid: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

export type NormalizeByIdsPayload = {
  mode: 'by_ids';
  reservation_ids: number[];
};

export async function normalizeCancelledPrices(payload: NormalizeByUidPayload | NormalizeByIdsPayload) {
  const { data, error } = await supabase.functions.invoke('reservations-normalize-cancelled', {
    body: payload,
  });
  if (error) throw new Error(error.message || String(error));
  return data as { success: boolean; normalized: number };
}
